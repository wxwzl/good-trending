/**
 * Crawlee 适配器层统一导出
 */

// 基础类
export {
  BaseCrawleeCrawler,
  type BaseCrawleeConfig,
  type CrawleeRequestContext,
} from "./base/base-crawler.js";

// Google 搜索
export {
  GoogleSearchCrawler,
  createGoogleSearchCrawler,
} from "./google/google-search.crawler.js";

export type {
  GoogleSearchResult,
  GoogleSearchOptions,
} from "./google/types.js";

// Reddit
export {
  RedditCrawler,
  createRedditCrawler,
} from "./reddit/reddit.crawler.js";

export type {
  RedditPostData,
  RedditCrawlOptions,
} from "./reddit/types.js";
