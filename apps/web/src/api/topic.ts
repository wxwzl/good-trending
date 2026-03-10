/**
 * Topic API
 * 分类相关接口
 */
import { fetchApi, FetchOptions } from "@/lib/fetch";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Topic, Product, PaginatedResponse } from "./types";

interface ListTopicsParams {
  page?: number;
  limit?: number;
}

/**
 * 获取分类列表（带缓存）
 * GET /api/v1/topics
 *
 * 缓存策略：
 * - stale: 1小时
 * - revalidate: 1小时
 * - 标签: topics
 */
export async function listTopics(params: ListTopicsParams = {}): Promise<PaginatedResponse<Topic>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<Topic>>(`/topics?${searchParams}`, {
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.TOPICS],
    },
  });
}

/**
 * 获取单个分类（带缓存）
 * GET /api/v1/topics/:slug
 *
 * 缓存策略：
 * - stale: 1小时
 * - revalidate: 1小时
 * - 标签: topics, topic:{slug}
 */
export async function getTopic(slug: string, option?: FetchOptions): Promise<Topic> {
  return fetchApi<Topic>(`/topics/${slug}`, {
    ...option,
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.TOPICS, CACHE_TAGS.TOPIC(slug)],
    },
  });
}

/**
 * 获取分类下的商品（带缓存）
 * GET /api/v1/topics/:slug/products
 *
 * 缓存策略：
 * - stale: 5分钟
 * - revalidate: 5分钟
 * - 标签: topic:{slug}:products, products
 */
export async function getTopicProducts(
  slug: string,
  params: ListTopicsParams = {}
): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<Product>>(`/topics/${slug}/products?${searchParams}`, {
    next: {
      revalidate: 300, // 5分钟
      tags: [CACHE_TAGS.TOPIC_PRODUCTS(slug), CACHE_TAGS.PRODUCTS],
    },
  });
}
