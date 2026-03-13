/**
 * Reddit 工厂
 * 根据配置创建对应的 Reddit 实现实例
 */

import { createRedditService, RedditService } from "../services/reddit-service.js";
import { RedditCrawler } from "../adapters/crawlee/reddit/reddit.crawler.js";
import type { IReddit } from "../domain/interfaces/index.js";
import {
  getCrawlerConfig,
  type CrawlerImplementation,
} from "../config/crawler.config.js";
import type { Page } from "playwright";

/**
 * Reddit 实例类型
 */
export type RedditInstance = IReddit;

/**
 * 创建 Reddit 实例
 * @param implementation 指定实现类型，不指定则使用配置
 * @returns Reddit 实例
 */
export function createReddit(implementation?: CrawlerImplementation): RedditInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    // Legacy: 需要特殊处理，因为现有 RedditService 需要 page 参数
    return new LegacyRedditAdapter();
  }
}

/**
 * Legacy Reddit 适配器
 * 注意：Legacy 实现需要外部传入 page 对象，这里做特殊处理
 */
class LegacyRedditAdapter implements IReddit {
  private service: RedditService;

  constructor() {
    this.service = createRedditService();
  }

  async fetchPost(_url: string): Promise<never> {
    // Legacy RedditService 需要 Page 对象
    // 这里简化处理，实际使用时可能需要创建浏览器实例
    throw new Error(
      "Legacy RedditService requires Playwright Page instance. " +
        "Use RedditCrawler instead, or use createRedditWithPage() with a page instance."
    );
  }

  async close() {
    // Legacy 无 close 方法
  }
}

/**
 * 创建 Reddit 实例（带 Page 参数的 Legacy 版本）
 * 用于兼容需要 Page 的场景
 * @param page Playwright Page 实例
 * @param implementation 指定实现类型
 * @returns Reddit 实例
 */
export function createRedditWithPage(
  page: Page,
  implementation?: CrawlerImplementation
): IReddit {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    return new LegacyRedditWithPageAdapter(page);
  }
}

/**
 * 带 Page 的 Legacy Reddit 适配器
 */
class LegacyRedditWithPageAdapter implements IReddit {
  private service: RedditService;
  private page: Page;

  constructor(page: Page) {
    this.service = createRedditService();
    this.page = page;
  }

  async fetchPost(url: string) {
    return this.service.fetchPost(this.page, url);
  }

  async close() {
    // Legacy 无 close 方法
  }
}
