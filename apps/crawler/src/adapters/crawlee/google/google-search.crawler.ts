/**
 * Google 搜索 Crawlee 实现
 * 基于 BaseCrawleeCrawler
 */

import { BaseCrawleeCrawler, type CrawleeRequestContext } from "../base/index.js";
import type { IGoogleSearch } from "../../../domain/interfaces/index.js";
import type { SearchResponse, SearchResult } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("google-search-crawler");

/**
 * Google 搜索 Crawlee 实现
 * 继承 BaseCrawleeCrawler，实现 IGoogleSearch 接口
 */
export class GoogleSearchCrawler extends BaseCrawleeCrawler implements IGoogleSearch {
  private searchResults: SearchResult[] = [];

  constructor() {
    super({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 50,
    });
  }

  /**
   * 请求处理器
   */
  protected async handleRequest(context: CrawleeRequestContext): Promise<void> {
    const { request, page } = context;
    logger.info(`搜索: ${request.label || request.url}`);

    try {
      // 等待搜索结果加载
      await this.waitForSelector(page, "#search, #rso, #main", 15000);

      // 随机延迟（反检测）
      await this.randomDelay(2000, 5000);

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
              el.closest("div[data-ved], div.g, div[data-sokoban-container]")?.querySelector("h3");
            const title = titleEl?.textContent || "";

            // 提取摘要
            let snippet = "";
            const container = el.closest("div[data-ved], div.g, div[data-sokoban-container]");
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

          if (links.length > 0) {
            break;
          }
        }

        return links;
      });

      logger.info(`提取到 ${results.length} 条搜索结果`);

      // 存储结果到实例变量
      this.searchResults = results.slice(0, 10).map((r, index) => ({
        ...r,
        position: index + 1,
      }));

      // 模拟人类滚动
      await page.mouse.wheel(0, 500);
      await this.randomDelay(1000, 2000);
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

  async search(query: string, _externalPage?: import("playwright").Page): Promise<SearchResponse> {
    // 清空之前的数据
    this.searchResults = [];

    // 构建搜索 URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    // 运行爬虫
    await this.runCrawler([{ url: searchUrl, label: query }]);

    return {
      success: this.searchResults.length > 0,
      totalResults: this.searchResults.length,
      links: this.searchResults,
      source: "browser",
    };
  }

  async close(): Promise<void> {
    await super.close();
    logger.info("Google 搜索爬虫已关闭");
  }
}

/**
 * 创建 Google 搜索 Crawler 实例
 * @returns GoogleSearchCrawler 实例
 */
export function createGoogleSearchCrawler(): GoogleSearchCrawler {
  return new GoogleSearchCrawler();
}
