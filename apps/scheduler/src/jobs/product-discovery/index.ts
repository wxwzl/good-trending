/**
 * 商品发现任务
 * 从 Reddit 搜索结果中发现亚马逊商品
 */

export { PRODUCT_DISCOVERY_SCHEDULE, PRODUCT_DISCOVERY_CONFIG } from "./scheduler.js";
export { processProductDiscoveryJob } from "./processor.js";
export { ProductDiscoveryCrawler } from "./crawler.js";
export type {
  ProductDiscoveryConfig,
  CategoryData,
  DiscoveredProduct,
  ProductDiscoveryResult,
} from "./types.js";
