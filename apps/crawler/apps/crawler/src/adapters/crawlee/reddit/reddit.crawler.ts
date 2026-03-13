/**
 * Reddit Crawlee 实现
 * 实现 IReddit 接口，与 AI 分析服务兼容
 */

import { PlaywrightCrawler } from "crawlee";
import type { IReddit } from "../../../domain/interfaces/index.js";
import type { RedditPost } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";
import { getStealthInitFunction } from "../../../infrastructure/index.js";

const logger = createLoggerInstance("reddit-crawler");

/**
 * Reddit Crawlee 实现
 * 实现 IReddit 接口
 *
 * 返回的 RedditPost 格式与 AI 分析服务兼容
 * 可直接传递给 AIAnalyzer.analyze(post)
 */
export class RedditCrawler implements IReddit {
  private crawler: PlaywrightCrawler;
  private lastPost: RedditPost | null = null;

  constructor() {
    // 存储 this 引用，以便在 requestHandler 中使用
    const self = this;

    this.crawler = new PlaywrightCrawler({
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 90,
      maxRequestsPerCrawl: 30,

      launchContext: {
        launchOptions: {
          headless: true,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
          ],
        },
      },

      preNavigationHooks: [
        async ({ page }) => {
          await page.addInitScript(getStealthInitFunction());
        },
      ],

      requestHandler: async ({ request, page }) => {
        logger.info(`爬取 Reddit: ${request.url}`);

        try {
          // 等待内容加载
          await page.waitForSelector(
            'h1, [data-testid="post-container"], shreddit-post',
            { timeout: 15000 }
          );

          // 随机延迟（反检测）
          await page.waitForTimeout(1500 + Math.random() * 2000);

          // 展开评论（如果需要）
          try {
            const moreButtons = await page
              .locator('button:has-text("more replies"), button:has-text("View more comments")')
              .all();
            for (const button of moreButtons.slice(0, 3)) {
              await button.click().catch(() => {});
              await page.waitForTimeout(500);
            }

            const readMoreButtons = await page.locator('button:has-text("Read more")').all();
            for (const button of readMoreButtons.slice(0, 5)) {
              await button.click().catch(() => {});
              await page.waitForTimeout(300);
            }
          } catch {}

          // 提取帖子数据
          const postData = await page.evaluate((maxComments) => {
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

              if (comments.length >= maxComments) break;
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

          // 存储结果
          self.lastPost = {
            ...postData,
            url: request.url,
          };

          logger.info(`成功提取帖子: ${postData.title.substring(0, 50)}...`);
        } catch (error) {
          logger.error(`爬取失败: ${request.url}`, { error: String(error) });
          throw error;
        }
      },

      failedRequestHandler: async ({ request }) => {
        logger.error(`请求失败: ${request.url}`);
      },
    });
  }

  /**
   * 获取帖子（实现 IReddit 接口）
   *
   * 返回的 RedditPost 格式与 AIAnalyzer.analyze(post: RedditPost) 完全兼容
   */
  async fetchPost(url: string): Promise<RedditPost | null> {
    this.lastPost = null;

    await this.crawler.run([{ url, label: "single-post" }]);

    return this.lastPost;
  }

  async close(): Promise<void> {
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
