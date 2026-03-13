/**
 * Good-Trending 爬虫包
 * 提供爬取相关的公共服务
 */

// 导出公共服务（供 scheduler 使用）
export {
  // AI 分析服务
  createAIAnalyzer,
  AIAnalyzerFactory,
  type AIAnalyzer,
  type AIConfig,
  type AIProvider,
  // 注意：AIAnalysisResult 和 RedditPost 从 domain/types/ 重新导出
} from "./services/ai/index.js";

// Amazon 搜索服务
export {
  AmazonSearchService,
  createAmazonSearchService,
  type AmazonProduct,
  type AmazonSearchConfig,
} from "./services/amazon-search-service.js";

// Reddit 服务
export {
  RedditService,
  createRedditService,
  type RedditServiceConfig,
} from "./services/reddit-service.js";

// 社交提及统计服务
export {
  SocialMentionService,
  createSocialMentionService,
  type ProductMentionStats,
  type PlatformMentions,
} from "./services/social-mention-service.js";

// Google 搜索服务
export {
  GoogleSearchService,
  // 注意：SearchResult 和 SearchResponse 从 domain/types/ 重新导出
} from "./services/google-search-service.js";

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

// 基础爬虫类
export { BaseCrawler, CrawlerStatus } from "./crawlers/BaseCrawler.js";

// 工具函数
export { formatDate } from "./utils/date.js";

/**
 * ============================================
 * 【新增】领域层导出 - 接口与类型
 * ============================================
 */

export type { IGoogleSearch, IReddit } from "./domain/interfaces/index.js";

export { GOOGLE_SEARCH_TOKEN, REDDIT_TOKEN } from "./domain/interfaces/index.js";

export type {
  RedditPost,
  AIAnalysisResult,
  SearchResult,
  SearchResponse,
} from "./domain/types/index.js";

/**
 * ============================================
 * 【新增】基础设施层导出 - 公共工具
 * ============================================
 */

export {
  // Browser
  getStealthInitFunction,
  getStealthScriptString,
  STEALTH_SCRIPTS,
  DESKTOP_USER_AGENTS,
  getRandomUserAgent,
  getChromeUserAgent,
  // Utils
  DELAY_RANGES,
  randomDelay,
  requestDelay,
  humanDelay,
  antiDetectionDelay,
  scrollDelay,
} from "./infrastructure/index.js";

/**
 * ============================================
 * 【新增】Crawlee 适配器导出
 * ============================================
 */

export {
  // Base
  BaseCrawleeCrawler,
  type BaseCrawleeConfig,
  type CrawleeRequestContext,
  // Google
  GoogleSearchCrawler,
  createGoogleSearchCrawler,
  type GoogleSearchResult,
  type GoogleSearchOptions,
  // Reddit
  RedditCrawler,
  createRedditCrawler,
  type RedditPostData,
  type RedditCrawlOptions,
} from "./adapters/crawlee/index.js";

/**
 * ============================================
 * 【新增】工厂层导出 - 创建爬虫实例
 * ============================================
 */

export {
  createGoogleSearch,
  type GoogleSearchInstance,
  createReddit,
  createRedditWithPage,
  type RedditInstance,
} from "./factories/index.js";

/**
 * ============================================
 * 【新增】配置导出
 * ============================================
 */

export {
  getCrawlerImplementation,
  isCrawleeEnabled,
  getCrawlerConfig,
  type CrawlerImplementation,
  type CrawlerModuleConfig,
} from "./config/crawler.config.js";
