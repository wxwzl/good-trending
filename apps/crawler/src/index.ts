/**
 * @package @good-trending/crawler
 * Good-Trending 爬虫包 — 对外统一入口
 *
 * ## 架构分层
 *
 * ```
 * factories/          ← 工厂层：根据配置创建正确的实现实例（使用方只需依赖此层）
 *   ├── google-search.factory.ts
 *   ├── reddit.factory.ts
 *   └── amazon-search.factory.ts
 *
 * domain/             ← 领域层：接口契约 + 共享类型（纯 TypeScript，无运行时依赖）
 *   ├── interfaces/   IGoogleSearch / IReddit / IAmazonSearch
 *   └── types/        AmazonProduct / RedditPost / SearchResponse ...
 *
 * adapters/legacy/    ← Legacy 实现：原生 Playwright，稳定可用，默认启用
 *   ├── base/         BaseLegacyCrawler（手动管理 Browser / Page）
 *   ├── google/       GoogleSearchService（SerpAPI + 浏览器双模式）
 *   ├── reddit/       RedditService（Page 注入模式）
 *   └── amazon/       AmazonSearchService
 *
 * adapters/crawlee/   ← Crawlee 实现：基于 crawlee 框架，可选启用
 *   ├── base/         BaseCrawleeCrawler（内置队列 / 重试 / 并发）
 *   ├── google/       GoogleSearchCrawler
 *   ├── reddit/       RedditCrawler
 *   └── amazon/       AmazonCrawler
 *
 * services/           ← 应用服务：数据处理、AI 分析（无爬虫替代的核心逻辑）
 *   ├── ai/           AIAnalyzer（Kimi / Bailian / Zhipu 三种 provider）
 *   ├── crawler-data-processor.ts  DB 写入 + Bitmap 滑动窗口统计
 *   └── social-mention-service.ts  Google 搜索统计 Reddit / X 提及次数
 *
 * infrastructure/     ← 基础设施：反检测脚本、User-Agent、延迟工具
 *
 * config/             ← 配置：CRAWLER_IMPLEMENTATION 环境变量控制 legacy/crawlee 切换
 * ```
 *
 * ## 切换实现
 * 默认使用 legacy，通过环境变量切换：
 * ```env
 * CRAWLER_IMPLEMENTATION=crawlee          # 全局切换
 * GOOGLE_SEARCH_IMPLEMENTATION=crawlee   # 只切换 Google
 * REDDIT_IMPLEMENTATION=legacy           # 只切换 Reddit
 * ```
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
