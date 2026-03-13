/**
 * Reddit Crawlee 实现
 * 基于 BaseCrawleeCrawler，实现 IReddit 接口
 */

import { BaseCrawleeCrawler, type CrawleeRequestContext } from "../base/index.js";
import type { IReddit } from "../../../domain/interfaces/index.js";
import type { RedditPost } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("reddit-crawler");

/**
 * Reddit Crawlee 实现
 * 继承 BaseCrawleeCrawler，实现 IReddit 接口
 *
 * 返回的 RedditPost 格式与 AI 分析服务兼容
 * 可直接传递给 AIAnalyzer.analyze(post)
 */
export class RedditCrawler extends BaseCrawleeCrawler implements IReddit {
  private lastPost: RedditPost | null = null;

  constructor() {
    super({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 90,
      maxRequestsPerCrawl: 30,
    });
  }

  /**
   * 请求处理器
   */
  protected async handleRequest(context: CrawleeRequestContext): Promise<void> {
    const { request, page } = context;
    logger.info(`爬取 Reddit: ${request.url}`);

    try {
      // 等待内容加载
      await this.waitForSelector(page, 'h1, [data-testid="post-container"], shreddit-post', 15000);

      // 随机延迟（反检测）
      await this.randomDelay(1500, 3500);

      // 展开评论（如果需要）
      await this.expandComments(page);

      // 提取帖子数据
      const postData = await this.extractPostData(page);

      // 存储结果
      this.lastPost = {
        ...postData,
        url: request.url,
      };

      logger.info(`成功提取帖子: ${postData.title.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`爬取失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 展开评论
   */
  private async expandComments(page: CrawleeRequestContext["page"]): Promise<void> {
    try {
      const moreButtons = await page
        .locator('button:has-text("more replies"), button:has-text("View more comments")')
        .all();
      for (const button of moreButtons.slice(0, 3)) {
        await button.click().catch(() => {});
        await this.randomDelay(300, 700);
      }

      const readMoreButtons = await page.locator('button:has-text("Read more")').all();
      for (const button of readMoreButtons.slice(0, 5)) {
        await button.click().catch(() => {});
        await this.randomDelay(200, 500);
      }
    } catch {
      // 忽略展开评论的错误
    }
  }

  /**
   * 提取帖子数据
   */
  private async extractPostData(
    page: CrawleeRequestContext["page"]
  ): Promise<Omit<RedditPost, "url">> {
    return page.evaluate((maxComments) => {
      const title =
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("h2")?.textContent?.trim() ||
        "";

      const content =
        document.querySelector('[data-testid="post-content"]')?.textContent?.trim() ||
        document.querySelector('div[data-click-id="text"]')?.textContent?.trim() ||
        "";

      const author =
        document.querySelector('[data-testid="post-author-link"]')?.textContent?.trim() ||
        document.querySelector('a[href^="/user/"]')?.textContent?.trim() ||
        "";

      const upvotesText =
        document.querySelector('[data-testid="upvote-button"]')?.textContent ||
        document.querySelector("faceplate-number")?.getAttribute("number") ||
        "0";
      const upvotes = parseInt(upvotesText.replace(/[^\d]/g, "")) || 0;

      const timeElement = document.querySelector("time");
      const postedAt = timeElement?.getAttribute("datetime") || "";

      const comments: string[] = [];
      const commentSelectors = [
        '[data-testid="comment"]',
        "shreddit-comment",
        'div[data-testid="comment"] > div',
      ];

      for (const selector of commentSelectors) {
        const commentElements = document.querySelectorAll(selector);
        commentElements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && comments.length < maxComments && text.length > 10) {
            comments.push(text);
          }
        });

        if (comments.length >= maxComments) {
          break;
        }
      }

      return {
        title,
        content,
        author,
        upvotes,
        postedAt,
        comments: comments.slice(0, maxComments),
      };
    }, 10);
  }

  /**
   * 获取帖子（实现 IReddit 接口）
   *
   * 返回的 RedditPost 格式与 AIAnalyzer.analyze(post: RedditPost) 完全兼容
   */
  async fetchPost(url: string): Promise<RedditPost | null> {
    this.lastPost = null;

    await this.runCrawler([{ url, label: "single-post" }]);

    return this.lastPost;
  }

  async close(): Promise<void> {
    await super.close();
    logger.info("Reddit 爬虫已关闭");
  }
}

/**
 * 创建 Reddit Crawler 实例
 * @returns RedditCrawler 实例
 */
export function createRedditCrawler(): RedditCrawler {
  return new RedditCrawler();
}
