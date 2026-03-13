/**
 * 领域层统一导出
 */

// 接口
export type { IGoogleSearch, IReddit, IAmazonSearch } from "./interfaces/index.js";
export { GOOGLE_SEARCH_TOKEN, REDDIT_TOKEN, AMAZON_SEARCH_TOKEN } from "./interfaces/index.js";

// 类型
export type {
  RedditPost,
  AIAnalysisResult,
  SearchResult,
  SearchResponse,
  AmazonProduct,
} from "./types/crawler.types.js";

// 错误
export {
  CrawlerError,
  NetworkError,
  TimeoutError,
  AntiDetectionError,
  CaptchaError,
  ExtractionError,
  ConfigurationError,
} from "./errors/index.js";
