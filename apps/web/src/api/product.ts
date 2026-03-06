/**
 * Product API
 * 商品相关接口
 */
import { fetchApi } from "@/lib/fetch";
import type { Product, PaginatedResponse } from "./types";

interface ListProductsParams {
  page?: number;
  limit?: number;
  sourceType?: string;
  topicId?: string;
}

/**
 * 获取商品列表
 * GET /api/v1/products
 */
export async function listProducts(
  params: ListProductsParams = {}
): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sourceType) searchParams.set("sourceType", params.sourceType);
  if (params.topicId) searchParams.set("topicId", params.topicId);

  return fetchApi<PaginatedResponse<Product>>(`/products?${searchParams}`, {
    revalidate: 300, // 5分钟缓存
  });
}

/**
 * 获取单个商品
 * GET /api/v1/products/:id
 */
export async function getProduct(id: string): Promise<Product> {
  return fetchApi<Product>(`/products/${id}`, { revalidate: 3600 }); // 1小时缓存
}

/**
 * 通过 slug 获取商品
 * GET /api/v1/products/slug/:slug
 */
export async function getProductBySlug(slug: string): Promise<Product> {
  return fetchApi<Product>(`/products/slug/${slug}`, { revalidate: 3600 }); // 1小时缓存
}
