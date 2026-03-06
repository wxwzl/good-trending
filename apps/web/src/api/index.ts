/**
 * API 客户端统一导出
 */

// 导出类型
export type { Product, Topic, TrendingItem, PaginatedResponse } from "./types";

// 导出 Product API
export { listProducts, getProduct, getProductBySlug } from "./product";

// 导出 Topic API
export { listTopics, getTopic, getTopicProducts } from "./topic";

// 导出 Trending API
export {
  listTrending,
  getDailyTrending,
  getWeeklyTrending,
  getMonthlyTrending,
  getTrendingByTopic,
} from "./trending";

// 导出 Search API
export { searchProducts } from "./search";

// 导出基础 fetch 和错误类
export { fetchApi, ApiError } from "@/lib/fetch";
