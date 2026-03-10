/**
 * Reddit 服务
 * 提供 Reddit 内容爬取和链接提取能力
 */

import { createLoggerInstance } from "@good-trending/shared";
import type { Page } from "playwright";

const logger = createLoggerInstance("reddit-service");

/**
 * Reddit 帖子数据
 */
export interface RedditPost {
  /** 帖子标题 */
  title: string;
  /** 帖子内容 */
  content?: string;
  /** 评论列表 */
  comments: string[];
  /** 帖子URL */
  url: string;
  /** 作者 */
  author?: string;
  /** 发布时间 */
  postedAt?: string;
  /** 点赞数 */
  upvotes?: number;
}

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
 * Reddit 服务
 * 提供 Reddit 内容提取和链接分析能力
 */
export class RedditService {
  private config: RedditServiceConfig;

  constructor(config: Partial<RedditServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 展开 Reddit 帖子内容
   * 点击 "Read more" 和 "View more comments" 按钮
   */
  async expandContent(page: Page): Promise<void> {
    logger.info("展开 Reddit 帖子内容...");

    try {
      // 点击所有 "Read more" 按钮
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

      // 点击 "View more comments" / "Continue this thread"
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
   * 从 Reddit 帖子中提取亚马逊链接
   * @param page - Playwright 页面实例
   * @returns 亚马逊链接列表
   */
  async extractAmazonLinks(page: Page): Promise<string[]> {
    logger.info("提取亚马逊链接...");

    const amazonLinks: string[] = [];

    try {
      // 展开内容
      await this.expandContent(page);

      // 提取所有链接
      const links = await page.locator('a[href*="amazon"], a[href*="amzn"]').all();

      for (const link of links) {
        try {
          const href = await link.getAttribute("href");
          if (href && this.isAmazonLink(href)) {
            // 解析短链接
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

    // 去重
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
    // 商品链接包含 /dp/ 或 /gp/product/
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
   * @param page - Playwright 页面实例
   * @returns 帖子数据
   */
  async extractPostContent(page: Page): Promise<RedditPost> {
    logger.info("提取帖子内容...");

    try {
      // 展开内容
      await this.expandContent(page);

      // 提取标题
      const titleElement = await page.$('h1, [data-testid="post-title"]');
      const title = titleElement ? (await titleElement.textContent()) || "" : "";

      // 提取正文
      const contentElement = await page.$('[data-testid="post-content"], .Post');
      const content = contentElement ? (await contentElement.textContent()) || "" : "";

      // 提取评论
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

      // 获取当前URL
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
   * 访问并提取 Reddit 帖子
   * @param page - Playwright 页面实例
   * @param url - Reddit 帖子 URL
   * @returns 帖子数据
   */
  async fetchPost(page: Page, url: string): Promise<RedditPost> {
    logger.info(`访问 Reddit 帖子: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(this.config.waitTime);

      return await this.extractPostContent(page);
    } catch (error) {
      logger.error(`访问帖子失败: ${error}`);
      throw error;
    }
  }
}

/**
 * 创建 Reddit 服务实例
 */
export function createRedditService(config?: Partial<RedditServiceConfig>): RedditService {
  return new RedditService(config);
}
