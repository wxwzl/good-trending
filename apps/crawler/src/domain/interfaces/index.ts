/**
 * 领域层接口统一导出
 */

export type { IGoogleSearch } from "./google-search.interface.js";
export { GOOGLE_SEARCH_TOKEN } from "./google-search.interface.js";
export type { IReddit } from "./reddit.interface.js";
export { REDDIT_TOKEN } from "./reddit.interface.js";

// 重新导出类型，方便使用
export type {
  RedditPost,
  AIAnalysisResult,
  SearchResult,
  SearchResponse,
} from "../types/crawler.types.js";
