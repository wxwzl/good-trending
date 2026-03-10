/**
 * Product API
 * 商品相关接口
 */
import { fetchApi, FetchOptions } from "@/lib/fetch";
import { CACHE_TAGS } from "@/lib/cache-tags";
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
  params: ListProductsParams = {},
  option?: FetchOptions
): Promise<PaginatedResponse<Product>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sourceType) searchParams.set("sourceType", params.sourceType);
  if (params.topicId) searchParams.set("topicId", params.topicId);

  return fetchApi<PaginatedResponse<Product>>(`/products?${searchParams}`, option);
}

/**
 * 获取单个商品（带缓存）
 * GET /api/v1/products/:id
 *
 * 缓存策略：
 * - stale: 30分钟
 * - revalidate: 1小时
 * - 标签: products, product:{id}
 */
export async function getProduct(id: string, option?: FetchOptions): Promise<Product> {
  return fetchApi<Product>(`/products/${id}`, {
    ...option,
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(id)],
    },
  });
}

/**
 * 通过 slug 获取商品（带缓存）
 * GET /api/v1/products/slug/:slug
 *
 * 缓存策略：
 * - stale: 30分钟
 * - revalidate: 1小时
 * - 标签: products, product:{slug}
 */
export async function getProductBySlug(slug: string, option?: FetchOptions): Promise<Product> {
  return fetchApi<Product>(`/products/slug/${slug}`, {
    ...option,
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(slug)],
    },
  });
}
