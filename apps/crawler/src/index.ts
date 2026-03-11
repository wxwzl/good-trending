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
  type AIAnalysisResult,
  type RedditPost,
  type AIConfig,
  type AIProvider,
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
  type SearchResult,
  type SearchResponse,
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
