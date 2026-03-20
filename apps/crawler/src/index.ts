/**
 * Good-Trending 爬虫包
 * 提供爬取相关的公共服务
 */

// AI 分析服务
export {
  createAIAnalyzer,
  AIAnalyzerFactory,
  type AIAnalyzer,
  type AIConfig,
  type AIProvider,
} from "./services/ai/index.js";

// 社交提及统计服务
export {
  SocialMentionService,
  createSocialMentionService,
  type ProductMentionStats,
  type PlatformMentions,
} from "./services/social-mention-service.js";

// 数据处理器
export {
  saveCategoryHeatStats,
  saveCrawledProducts,
  saveProductSocialStats,
  updateAllProductsBitmap,
  saveCrawlerLog,
} from "./services/crawler-data-processor.js";

// 类型导出
export type {
  CategoryData,
  CrawledProduct,
  CrawlerLogData,
  CategoryHeatResult,
  ProductMentionStat,
} from "./types/crawler.types.js";

// 工具函数
export { formatDate } from "./utils/date.js";

/**
 * ============================================
 * 领域层导出 - 接口、类型与错误
 * ============================================
 */

export {
  // 接口
  type IGoogleSearch,
  type IReddit,
  type IAmazonSearch,
  GOOGLE_SEARCH_TOKEN,
  REDDIT_TOKEN,
  AMAZON_SEARCH_TOKEN,
  // 类型
  type RedditPost,
  type AIAnalysisResult,
  type SearchResult,
  type SearchResponse,
  type AmazonProduct,
  // 错误
  CrawlerError,
  NetworkError,
  TimeoutError,
  AntiDetectionError,
  CaptchaError,
  ExtractionError,
  ConfigurationError,
} from "./domain/index.js";

/**
 * ============================================
 * 基础设施层导出 - 公共工具
 * ============================================
 */

export {
  getStealthInitFunction,
  getStealthScriptString,
  STEALTH_SCRIPTS,
  DESKTOP_USER_AGENTS,
  getRandomUserAgent,
  getChromeUserAgent,
  DELAY_RANGES,
  randomDelay,
  requestDelay,
  humanDelay,
  antiDetectionDelay,
  scrollDelay,
} from "./infrastructure/index.js";

/**
 * ============================================
 * Legacy 适配器导出（旧实现，效果更好）
 * ============================================
 */

export { BaseLegacyCrawler, CrawlerStatus } from "./adapters/legacy/base/index.js";
export type { CrawlerConfig, CrawlResult } from "./adapters/legacy/base/index.js";

export { GoogleSearchService } from "./adapters/legacy/google/index.js";
export type { GoogleSearchServiceConfig } from "./adapters/legacy/google/index.js";

export {
  RedditService,
  createRedditService,
  createRedditServiceWithPage,
} from "./adapters/legacy/reddit/index.js";
export type { RedditServiceConfig } from "./adapters/legacy/reddit/index.js";

export { AmazonSearchService, createAmazonSearchService } from "./adapters/legacy/amazon/index.js";
export type { AmazonSearchConfig } from "./adapters/legacy/amazon/index.js";

/**
 * ============================================
 * Crawlee 适配器导出
 * ============================================
 */

export {
  BaseCrawleeCrawler,
  type BaseCrawleeConfig,
  type CrawleeRequestContext,
  GoogleSearchCrawler,
  createGoogleSearchCrawler,
  type GoogleSearchResult,
  type GoogleSearchOptions,
  RedditCrawler,
  createRedditCrawler,
  type RedditPostData,
  type RedditCrawlOptions,
  AmazonCrawler,
  createAmazonCrawler,
  type AmazonSearchResult,
  type AmazonCrawlOptions,
} from "./adapters/crawlee/index.js";

/**
 * ============================================
 * 工厂层导出 - 创建爬虫实例
 * ============================================
 */

export {
  createGoogleSearch,
  type GoogleSearchInstance,
  createReddit,
  createRedditWithPage,
  type RedditInstance,
  createAmazonSearch,
  type AmazonSearchInstance,
} from "./factories/index.js";

/**
 * ============================================
 * 配置导出
 * ============================================
 */

export {
  getCrawlerImplementation,
  isCrawleeEnabled,
  getCrawlerConfig,
  type CrawlerImplementation,
  type CrawlerModuleConfig,
} from "./config/crawler.config.js";
