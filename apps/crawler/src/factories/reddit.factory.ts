/**
 * Reddit 工厂
 * 根据配置创建对应的 Reddit 实现实例
 */

import { RedditService } from "../adapters/legacy/reddit/index.js";
import { RedditCrawler } from "../adapters/crawlee/reddit/reddit.crawler.js";
import type { IReddit } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";
import type { Page } from "playwright";

/**
 * Reddit 实例类型
 */
export type RedditInstance = IReddit;

/**
 * 创建 Reddit 实例（无 page，只能用于 crawlee 模式）
 * Legacy 模式需要 page，请使用 createRedditWithPage()
 */
export function createReddit(implementation?: CrawlerImplementation): RedditInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    // Legacy 模式需要 page，这里返回无 page 的实例
    // fetchPost() 调用时会抛出明确错误提示
    return new RedditService(null);
  }
}

/**
 * 创建带 Page 的 Reddit 实例（Legacy 模式必须使用此方法）
 */
export function createRedditWithPage(page: Page, implementation?: CrawlerImplementation): IReddit {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    return new RedditService(page);
  }
}
