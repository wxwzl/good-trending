/**
 * AI 商品发现任务模块
 * 使用 AI 分析 Reddit 帖子，在亚马逊搜索相关商品
 *
 * 任务流程：
 * 1. 搜索类目相关的 Reddit 帖子
 * 2. AI 分析帖子内容提取商品关键词
 * 3. 在亚马逊搜索关键词获取商品
 * 4. 保存商品到数据库（不更新 Bitmap）
 */

// 导出调度配置
export {
  AI_PRODUCT_DISCOVERY_JOB_NAME,
  AI_PRODUCT_DISCOVERY_CRON,
  AI_PRODUCT_DISCOVERY_CONFIG,
} from "./scheduler.js";

// 导出处理器
export { processAIProductDiscoveryJob } from "./processor.js";

// 导出爬虫
export { AIProductDiscoveryCrawler } from "./crawler.js";

// 导出类型
export type {
  AIProductDiscoveryConfig,
  AIProductDiscoveryResult,
  DiscoveredProduct,
  ProcessedPost,
} from "./types.js";
