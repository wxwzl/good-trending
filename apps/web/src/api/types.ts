/**
 * API 类型定义
 */

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
  productSlug: string;
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
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
