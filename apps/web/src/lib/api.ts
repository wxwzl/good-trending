/**
 * API client - 统一导出
 * 从新的模块化 API 结构中重新导出，保持向后兼容
 *
 * 新的 API 模块结构：
 * - @/lib/fetch - 基础 fetch 包装
 * - @/api/product - 商品 API
 * - @/api/topic - 分类 API
 * - @/api/trending - 热门趋势 API
 * - @/api/search - 搜索 API
 */

// 导出错误类和基础 fetch
export { fetchApi, ApiError } from "@/lib/fetch";

// 导出类型
export type { Product, Topic, TrendingItem, PaginatedResponse } from "@/api/types";

// 导出 Product API
import { listProducts, getProduct, getProductBySlug } from "@/api/product";
import type { Product, PaginatedResponse } from "@/api/types";

export const productApi = {
  list: listProducts,
  get: getProduct,
  getBySlug: getProductBySlug,
};

// 导出 Topic API
import { listTopics, getTopic, getTopicProducts } from "@/api/topic";
import type { Topic } from "@/api/types";

export const topicApi = {
  list: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Topic>> => {
    const topics = await listTopics(params);
    // 包装成 PaginatedResponse 以保持向后兼容
    return {
      data: topics,
      total: topics.length,
      page: params?.page || 1,
      limit: params?.limit || topics.length,
      totalPages: 1,
    };
  },
  get: getTopic,
  products: getTopicProducts,
};

// 导出 Trending API
import {
  listTrending,
  getDailyTrending,
  getWeeklyTrending,
  getMonthlyTrending,
  getTrendingByTopic,
} from "@/api/trending";

export const trendingApi = {
  list: listTrending,
  daily: getDailyTrending,
  weekly: getWeeklyTrending,
  monthly: getMonthlyTrending,
  byTopic: getTrendingByTopic,
};

// 导出 Search API
import { searchProducts } from "@/api/search";

export const searchApi = {
  products: searchProducts,
};
