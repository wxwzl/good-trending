/**
 * API client for fetching data from the backend
 * 支持 SSR 和客户端，自动选择正确的 API 地址
 */

/**
 * 获取 API 基础 URL
 * 服务端渲染使用 API_URL (Docker 容器内访问主机)
 * 客户端使用 NEXT_PUBLIC_API_URL
 */
const getApiBaseUrl = (): string => {
  // 服务端渲染 (Node.js 环境) - 使用 localhost 因为没有使用 Docker
  if (typeof window === "undefined") {
    return process.env.API_URL || "http://localhost:3015/api/v1";
  }
  // 浏览器环境
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3015/api/v1";
};

interface FetchOptions extends RequestInit {
  locale?: string;
  revalidate?: number; // Next.js revalidate (秒)
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { locale = "en", revalidate, ...fetchOptions } = options;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // 构建请求选项
  const requestInit: RequestInit = {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale,
      ...fetchOptions.headers,
    },
  };

  // 服务端渲染时添加 revalidate 选项
  const nextOptions = revalidate ? { next: { revalidate } } : undefined;

  const response = await fetch(url, {
    ...requestInit,
    ...nextOptions,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new ApiError(errorData.message || `HTTP ${response.status}`, response.status, response);
  }

  const data = await response.json();
  // 兼容后端直接返回数据包装在 data 字段中的情况
  return data.data || data;
}

export { ApiError };

// ============================================
// Types
// ============================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: "X_PLATFORM" | "AMAZON";
  createdAt: string;
  updatedAt: string;
  // Additional fields from trending
  trendingScore?: number;
  rank?: number;
  mentions?: number;
  views?: number;
  likes?: number;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrendingItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productPrice: string | null;
  date: string;
  rank: number;
  score: number;
  mentions: number;
  views: number;
  likes: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Product API
// ============================================

export const productApi = {
  /**
   * Get product list
   * GET /api/v1/products
   */
  list: async (params: {
    page?: number;
    limit?: number;
    sourceType?: string;
    topicId?: string;
  }): Promise<PaginatedResponse<Product>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sourceType) searchParams.set("sourceType", params.sourceType);
    if (params.topicId) searchParams.set("topicId", params.topicId);
    return fetchApi<PaginatedResponse<Product>>(`/products?${searchParams}`, {
      revalidate: 300, // 5分钟缓存
    });
  },

  /**
   * Get single product by ID
   * GET /api/v1/products/:id
   */
  get: (id: string): Promise<Product> => {
    return fetchApi<Product>(`/products/${id}`, { revalidate: 3600 }); // 1小时缓存
  },

  /**
   * Get single product by slug
   * GET /api/v1/products/slug/:slug
   */
  getBySlug: (slug: string): Promise<Product> => {
    return fetchApi<Product>(`/products/slug/${slug}`, { revalidate: 3600 }); // 1小时缓存
  },
};

// ============================================
// Topic API
// ============================================

export const topicApi = {
  /**
   * Get all topics
   * GET /api/v1/topics
   */
  list: async (params?: { page?: number; limit?: number }): Promise<Topic[]> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<Topic[]>(`/topics?${searchParams}`);
  },

  /**
   * Get topic by slug
   * GET /api/v1/topics/:slug
   */
  get: (slug: string): Promise<Topic> => {
    return fetchApi<Topic>(`/topics/${slug}`);
  },

  /**
   * Get products by topic
   * GET /api/v1/topics/:slug/products
   */
  products: async (
    slug: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Product>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<Product>>(`/topics/${slug}/products?${searchParams}`);
  },
};

// ============================================
// Trending API
// ============================================

export const trendingApi = {
  /**
   * Get trending products
   * GET /api/v1/trending
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    period?: "daily" | "weekly" | "monthly";
  }): Promise<PaginatedResponse<TrendingItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.period) searchParams.set("period", params.period);
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending?${searchParams}`, {
      revalidate: 300, // 5分钟缓存
    });
  },

  /**
   * Get daily trending
   * GET /api/v1/trending/daily
   */
  daily: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TrendingItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/daily?${searchParams}`);
  },

  /**
   * Get weekly trending
   * GET /api/v1/trending/weekly
   */
  weekly: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TrendingItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/weekly?${searchParams}`);
  },

  /**
   * Get monthly trending
   * GET /api/v1/trending/monthly
   */
  monthly: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TrendingItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/monthly?${searchParams}`);
  },

  /**
   * Get trending by topic
   * GET /api/v1/trending/topic/:slug
   */
  byTopic: async (
    slug: string,
    params?: {
      page?: number;
      limit?: number;
      period?: "daily" | "weekly" | "monthly";
    }
  ): Promise<PaginatedResponse<TrendingItem>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.period) searchParams.set("period", params.period);
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending/topic/${slug}?${searchParams}`);
  },
};

// ============================================
// Search API
// ============================================

export const searchApi = {
  /**
   * Search products
   * GET /api/v1/search?q=...
   */
  products: async (params: {
    q: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Product>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<Product>>(`/search?${searchParams}`);
  },
};
