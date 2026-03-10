/**
 * Trending API
 * 热门趋势相关接口
 */
import { fetchApi } from "@/lib/fetch";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { TrendingItem, PaginatedResponse } from "./types";

interface ListTrendingParams {
  page?: number;
  limit?: number;
  period?: "daily" | "weekly" | "monthly";
}

/**
 * 获取热门趋势列表（带缓存）
 * GET /api/v1/trending
 *
 * 缓存策略：
 * - stale: 5分钟
 * - revalidate: 5分钟
 * - 标签: trending, trending:{period}
 */
export async function listTrending(
  params: ListTrendingParams = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const { page, limit, period = "daily" } = params;

  const searchParams = new URLSearchParams();
  if (page) searchParams.set("page", String(page));
  if (limit) searchParams.set("limit", String(limit));
  searchParams.set("period", period);

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending?${searchParams}`, {
    next: {
      revalidate: 300, // 5分钟
      tags: [CACHE_TAGS.TRENDING, `${CACHE_TAGS.TRENDING}:${period}`],
    },
  });
}

/**
 * 获取热门趋势列表（客户端用，无缓存）
 * GET /api/v1/trending
 */
export async function listTrendingClient(
  params: ListTrendingParams = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.period) searchParams.set("period", params.period);

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending?${searchParams}`, {
    cache: "no-store",
  });
}

/**
 * 获取每日热门
 * GET /api/v1/trending/daily
 */
export async function getDailyTrending(
  params: Omit<ListTrendingParams, "period"> = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/daily?${searchParams}`);
}

/**
 * 获取每周热门
 * GET /api/v1/trending/weekly
 */
export async function getWeeklyTrending(
  params: Omit<ListTrendingParams, "period"> = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/weekly?${searchParams}`);
}

/**
 * 获取每月热门
 * GET /api/v1/trending/monthly
 */
export async function getMonthlyTrending(
  params: Omit<ListTrendingParams, "period"> = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/monthly?${searchParams}`);
}

/**
 * 获取分类下的热门
 * GET /api/v1/trending/topic/:slug
 */
export async function getTrendingByTopic(
  slug: string,
  params: ListTrendingParams = {}
): Promise<PaginatedResponse<TrendingItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.period) searchParams.set("period", params.period);

  return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/topic/${slug}?${searchParams}`);
}
