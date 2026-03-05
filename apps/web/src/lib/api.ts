/**
 * API client for fetching data from the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface FetchOptions extends RequestInit {
  locale?: string;
}

interface ApiResponse<T> {
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  statusCode?: number;
  message?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const { locale = "en", ...fetchOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": locale,
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return {
        statusCode: response.status,
        message: error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      statusCode: 500,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ============================================
// Types
// ============================================

export interface Product {
  id: string;
  name: string;
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
  product: Product;
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
  }): Promise<ApiResponse<PaginatedResponse<Product>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sourceType) searchParams.set("sourceType", params.sourceType);
    if (params.topicId) searchParams.set("topicId", params.topicId);
    return fetchApi<PaginatedResponse<Product>>(`/products?${searchParams}`);
  },

  /**
   * Get single product by ID
   * GET /api/v1/products/:id
   */
  get: (id: string): Promise<ApiResponse<Product>> => {
    return fetchApi<Product>(`/products/${id}`);
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
  list: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Topic[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<Topic[]>(`/topics?${searchParams}`);
  },

  /**
   * Get topic by slug
   * GET /api/v1/topics/:slug
   */
  get: (slug: string): Promise<ApiResponse<Topic>> => {
    return fetchApi<Topic>(`/topics/${slug}`);
  },

  /**
   * Get products by topic
   * GET /api/v1/topics/:slug/products
   */
  products: async (
    slug: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<PaginatedResponse<Product>>> => {
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
  }): Promise<ApiResponse<PaginatedResponse<TrendingItem>>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.period) searchParams.set("period", params.period);
    return fetchApi<PaginatedResponse<TrendingItem>>(`/trending?${searchParams}`);
  },

  /**
   * Get daily trending
   * GET /api/v1/trending/daily
   */
  daily: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<TrendingItem>>> => {
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
  }): Promise<ApiResponse<PaginatedResponse<TrendingItem>>> => {
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
  }): Promise<ApiResponse<PaginatedResponse<TrendingItem>>> => {
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
  ): Promise<ApiResponse<PaginatedResponse<TrendingItem>>> => {
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
  }): Promise<ApiResponse<PaginatedResponse<Product>>> => {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    return fetchApi<PaginatedResponse<Product>>(`/search?${searchParams}`);
  },
};
