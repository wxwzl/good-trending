/**
 * Reddit Legacy 爬虫
 * 基于 Playwright Page 实例的 Reddit 内容爬取实现
 * 实现 IReddit 接口，page 通过构造函数注入
 */

import { createLoggerInstance } from "@good-trending/shared";
import type { Page } from "playwright";
import type { IReddit } from "../../../domain/interfaces/index.js";
import type { RedditPost } from "../../../domain/types/index.js";

const logger = createLoggerInstance("reddit-legacy-crawler");

/**
 * Reddit 服务配置
 */
export interface RedditServiceConfig {
  /** 请求超时 (毫秒) */
  timeout: number;
  /** 页面加载等待时间 (毫秒) */
  waitTime: number;
}

const DEFAULT_CONFIG: RedditServiceConfig = {
  timeout: 30000,
  waitTime: 3000,
};

/**
 * Reddit Legacy 爬虫
 * page 通过构造函数注入，实现 IReddit 接口
 */
export class RedditService implements IReddit {
  private config: RedditServiceConfig;
  private page: Page | null;

  constructor(page: Page | null = null, config: Partial<RedditServiceConfig> = {}) {
    this.page = page;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 展开 Reddit 帖子内容
   */
  async expandContent(page: Page): Promise<void> {
    logger.info("展开 Reddit 帖子内容...");

    try {
      const readMoreButtons = await page
        .locator('button[data-click-id="text"], button:has-text("Read more")')
        .all();

      for (const btn of readMoreButtons.slice(0, 5)) {
        try {
          const text = await btn.textContent();
          if (text?.includes("Read more")) {
            await btn.click();
            await page.waitForTimeout(500);
          }
        } catch {
          // 忽略点击失败的按钮
        }
      }

      let attempts = 0;
      while (attempts < 3) {
        try {
          const moreCommentsButton = page
            .locator(
              'button:has-text("View more comments"), button:has-text("Continue this thread")'
            )
            .first();

          if (await moreCommentsButton.isVisible({ timeout: 1000 })) {
            await moreCommentsButton.click();
            await page.waitForTimeout(1000);
            attempts++;
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      logger.info("内容展开完成");
    } catch (error) {
      logger.warn(`展开内容失败: ${error}`);
    }
  }

  /**
   * 从 Reddit 帖子中提取亚马逊链接（需要传入 Playwright Page 实例）
   * 注意：此方法不在 IReddit 接口中，是 RedditService 特有的扩展方法
   */
  async extractAmazonLinksFromPage(page: Page): Promise<string[]> {
    logger.info("提取亚马逊链接...");

    const amazonLinks: string[] = [];

    try {
      await this.expandContent(page);

      const links = await page.locator('a[href*="amazon"], a[href*="amzn"]').all();

      for (const link of links) {
        try {
          const href = await link.getAttribute("href");
          if (href && this.isAmazonLink(href)) {
            const resolvedUrl = await this.resolveShortLink(page, href);
            const finalUrl = resolvedUrl || href;

            if (this.isAmazonProductLink(finalUrl)) {
              amazonLinks.push(finalUrl);
            }
          }
        } catch {
          // 忽略提取失败的链接
        }
      }
    } catch (error) {
      logger.error(`提取链接失败: ${error}`);
    }

    const uniqueLinks = [...new Set(amazonLinks)];
    logger.info(`提取到 ${uniqueLinks.length} 个亚马逊链接`);

    return uniqueLinks;
  }

  /**
   * 判断是否为亚马逊链接
   */
  private isAmazonLink(url: string): boolean {
    const amazonDomains = [
      "amazon.com",
      "amazon.co.uk",
      "amazon.de",
      "amazon.fr",
      "amazon.co.jp",
      "amazon.cn",
      "amzn.to",
      "amzn.com",
    ];
    return amazonDomains.some((domain) => url.includes(domain));
  }

  /**
   * 判断是否为亚马逊商品链接
   */
  private isAmazonProductLink(url: string): boolean {
    return /\/dp\/[A-Z0-9]{10}/.test(url) || /\/gp\/product\/[A-Z0-9]{10}/.test(url);
  }

  /**
   * 解析短链接获取真实 URL
   */
  private async resolveShortLink(page: Page, shortUrl: string): Promise<string | null> {
    if (!shortUrl.includes("amzn.to") && !shortUrl.includes("amzn.com")) {
      return null;
    }

    try {
      const response = await page.evaluate(async (url: string) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const resp = await fetch(url, {
            method: "HEAD",
            redirect: "manual",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return resp.headers.get("location") || null;
        } catch {
          return null;
        }
      }, shortUrl);

      return response;
    } catch (error) {
      logger.warn(`短链接解析失败: ${error}`);
      return null;
    }
  }

  /**
   * 提取 Reddit 帖子内容
   */
  async extractPostContent(page: Page): Promise<RedditPost> {
    logger.info("提取帖子内容...");

    try {
      await this.expandContent(page);

      const titleElement = await page.$('h1, [data-testid="post-title"]');
      const title = titleElement ? (await titleElement.textContent()) || "" : "";

      const contentElement = await page.$('[data-testid="post-content"], .Post');
      const content = contentElement ? (await contentElement.textContent()) || "" : "";

      const commentElements = await page.locator('[data-testid="comment"], .Comment').all();
      const comments: string[] = [];

      for (const comment of commentElements.slice(0, 20)) {
        try {
          const text = await comment.textContent();
          if (text) {
            comments.push(text.trim());
          }
        } catch {
          // 忽略提取失败的评论
        }
      }

      const url = page.url();

      return {
        title: title.trim(),
        content: content.trim() || undefined,
        comments,
        url,
      };
    } catch (error) {
      logger.error(`提取帖子内容失败: ${error}`);
      return {
        title: "",
        comments: [],
        url: page.url(),
      };
    }
  }

  /**
   * 实现 IReddit 接口：fetchPost(url)
   * 使用构造函数注入的 page 实例
   */
  async fetchPost(url: string): Promise<RedditPost | null> {
    if (!this.page) {
      throw new Error(
        "RedditService requires a Playwright Page instance. " +
          "Pass page to the constructor: new RedditService(page)"
      );
    }

    logger.info(`访问 Reddit 帖子: ${url}`);

    try {
      await this.page.goto(url, { waitUntil: "networkidle" });
      await this.page.waitForTimeout(this.config.waitTime);

      return await this.extractPostContent(this.page);
    } catch (error) {
      logger.error(`访问帖子失败: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    // page 生命周期由外部管理，这里不关闭
  }
}

/**
 * 创建 Reddit 服务实例（无 page，用于提取功能）
 */
export function createRedditService(config?: Partial<RedditServiceConfig>): RedditService {
  return new RedditService(null, config);
}

/**
 * 创建带 page 的 Reddit 服务实例（用于 fetchPost）
 */
export function createRedditServiceWithPage(
  page: Page,
  config?: Partial<RedditServiceConfig>
): RedditService {
  return new RedditService(page, config);
}
