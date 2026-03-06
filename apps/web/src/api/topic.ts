/**
 * Topic API
 * 分类相关接口
 */
import { fetchApi } from "@/lib/fetch";
import type { Topic, Product, PaginatedResponse } from "./types";

interface ListTopicsParams {
  page?: number;
  limit?: number;
}

/**
 * 获取分类列表
 * GET /api/v1/topics
 */
export async function listTopics(params: ListTopicsParams = {}): Promise<Topic[]> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await fetchApi<PaginatedResponse<Topic>>(`/topics?${searchParams}`);
  return response.data;
}

/**
 * 获取单个分类
 * GET /api/v1/topics/:slug
 */
export async function getTopic(slug: string): Promise<Topic> {
  return fetchApi<Topic>(`/topics/${slug}`);
}

/**
 * 获取分类下的商品
 * GET /api/v1/topics/:slug/products
 */
export async function getTopicProducts(
  slug: string,
  params: ListTopicsParams = {}
): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<Product>>(`/topics/${slug}/products?${searchParams}`);
}
