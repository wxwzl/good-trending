/**
 * 任务处理器模块导出
 */
export {
  createCrawlerProcessor,
  closeCrawlerProcessor,
  getRegisteredHandlers,
} from "./crawler/index.js";

export { createTrendingProcessor, closeTrendingProcessor } from "./trending/index.js";
