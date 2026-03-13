/**
 * Google 搜索 Crawlee 实现
 */

import { BaseCrawleeCrawler, type CrawleeRequestContext } from "../base/base-crawler.js";
import type { GoogleSearchResult } from "./types.js";
import type { IGoogleSearch } from "../../../domain/interfaces/index.js";
import type { SearchResponse } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("google-search-crawler");

/**
 * Google 搜索 Crawlee 实现
 * 实现 IGoogleSearch 接口
 */
export class GoogleSearchCrawler
  extends BaseCrawleeCrawler<GoogleSearchResult>
  implements IGoogleSearch
{
  constructor() {
    super({
      name: "google-search-crawler",
      maxConcurrency: 2, // Google 限制较严格，降低并发
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 50,
    });
  }

  /**
   * 处理搜索请求
   */
  protected async handleRequest({
    request,
    page,
    pushData,
  }: CrawleeRequestContext): Promise<void> {
    logger.info(`搜索: ${request.label || request.url}`);

    try {
      // 等待搜索结果加载
      await page.waitForSelector("#search, #rso, #main", { timeout: 15000 });

      // 随机延迟（反检测）
      await page.waitForTimeout(2000 + Math.random() * 3000);

      // 提取搜索结果
      const results = await page.evaluate(() => {
        const links: Array<{ title: string; url: string; snippet: string }> = [];

        // 多选择器策略适配不同页面结构
        const selectors = [
          'div[data-ved] a[jsname="UWckNb"]',
          'div.g a[href^="http"]',
          "div.yuRUbf > a",
          'div[data-sokoban-container] a[href^="http"]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);

          for (const el of elements) {
            const url = el.getAttribute("href");
            const titleEl =
              el.querySelector("h3") ||
              el
                .closest("div[data-ved], div.g, div[data-sokoban-container]")
                ?.querySelector("h3");
            const title = titleEl?.textContent || "";

            // 提取摘要
            let snippet = "";
            const container = el.closest(
              "div[data-ved], div.g, div[data-sokoban-container]"
            );
            if (container) {
              const snippetEl = container.querySelector(
                'div[data-sncf="1"], div.VwiC3b, span.aCOpRe'
              );
              snippet = snippetEl?.textContent || "";
            }

            if (url && title && !url.includes("google.com")) {
              links.push({
                title: title.trim(),
                url: url,
                snippet: snippet.trim(),
              });
            }
          }

          if (links.length > 0) break;
        }

        return links;
      });

      logger.info(`提取到 ${results.length} 条搜索结果`);

      // 存储结果（带位置信息）
      const searchResults: GoogleSearchResult[] = results
        .slice(0, 10)
        .map((r, index) => ({
          ...r,
          position: index + 1,
        }));

      for (const result of searchResults) {
        await pushData(result);
      }

      // 模拟人类滚动
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000 + Math.random() * 1000);
    } catch (error) {
      logger.error(`搜索失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 执行搜索（实现 IGoogleSearch 接口）
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  async search(query: string): Promise<SearchResponse> {
    // 清空之前的数据
    await this.clearData();

    // 构建搜索 URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    // 添加搜索请求
    await this.addRequests([{ url: searchUrl, label: query }]);

    // 运行爬虫
    await this.run();

    // 获取结果
    const data = await this.getData();
    const results = data.items.slice(0, 10);

    return {
      success: results.length > 0,
      totalResults: results.length,
      links: results,
      source: "browser",
    };
  }
}

/**
 * 创建 Google 搜索 Crawler 实例
 * @returns GoogleSearchCrawler 实例
 */
export function createGoogleSearchCrawler(): GoogleSearchCrawler {
  return new GoogleSearchCrawler();
}
