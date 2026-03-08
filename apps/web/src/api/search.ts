/**
 * Search API
 * 搜索相关接口
 */
import { fetchApi } from "@/lib/fetch";
import type { Product, PaginatedResponse, SearchResultItem } from "./types";

interface SearchProductsParams {
  q: string;
  page?: number;
  limit?: number;
}

/**
 * 搜索商品
 * GET /api/v1/search?q=...
 */
export async function searchProducts(
  params: SearchProductsParams
): Promise<PaginatedResponse<SearchResultItem>> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.q);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  return fetchApi<PaginatedResponse<SearchResultItem>>(`/search?${searchParams}`);
}
