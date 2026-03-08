/**
 * @good-trending/dto/response
 *
 * 响应数据类型定义模块
 * 包含所有 API 接口的响应数据类型
 */

import { PaginatedResponse, SourceType } from '../common';

// ============================================
// Product 商品相关响应
// ============================================

/**
 * 商品基础信息
 */
export interface ProductBase {
  /** 商品 ID */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品 slug */
  slug: string;
  /** 商品描述 */
  description?: string;
  /** 商品图片 URL */
  image?: string;
  /** 商品价格 */
  price?: string;
  /** 货币单位 */
  currency?: string;
  /** 来源 URL */
  sourceUrl: string;
  /** 来源 ID */
  sourceId: string;
  /** 数据来源类型 */
  sourceType: SourceType;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 商品响应数据
 * 单个商品的完整信息
 */
export interface ProductResponse extends ProductBase {}

/**
 * 分页商品列表响应
 */
export interface PaginatedProductsResponse
  extends PaginatedResponse<ProductResponse> {}

// ============================================
// Topic 分类相关响应
// ============================================

/**
 * 分类基础信息
 */
export interface TopicBase {
  /** 分类 ID */
  id: string;
  /** 分类名称 */
  name: string;
  /** 分类 slug */
  slug: string;
  /** 分类描述 */
  description?: string;
  /** 分类图片 URL */
  imageUrl?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 分类响应数据（含商品数量）
 */
export interface TopicWithProductCount extends TopicBase {
  /** 商品数量 */
  productCount: number;
}

/**
 * 分类响应数据
 */
export interface TopicResponse extends TopicWithProductCount {}

/**
 * 分页分类列表响应
 */
export interface PaginatedTopicsResponse
  extends PaginatedResponse<TopicWithProductCount> {}

/**
 * 分页分类商品列表响应
 */
export interface PaginatedTopicProductsResponse
  extends PaginatedResponse<ProductResponse> {}

// ============================================
// Trending 趋势相关响应
// ============================================

/**
 * 趋势项数据
 */
export interface TrendingItem {
  /** 趋势记录 ID */
  id: string;
  /** 商品 ID */
  productId: string;
  /** 商品 slug */
  productSlug: string;
  /** 商品名称 */
  productName: string;
  /** 商品图片 */
  productImage: string | null;
  /** 商品价格 */
  productPrice: string | null;
  /** 日期 */
  date: string;
  /** 排名 */
  rank: number;
  /** 趋势分数 */
  score: number;
  /** 提及次数 */
  mentions: number;
  /** 浏览次数 */
  views: number;
  /** 点赞数 */
  likes: number;
}

/**
 * 分页趋势列表响应
 */
export interface PaginatedTrendingResponse
  extends PaginatedResponse<TrendingItem> {}

// ============================================
// Search 搜索相关响应
// ============================================

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  /** 商品 ID */
  id: string;
  /** 商品 slug */
  slug: string;
  /** 商品名称 */
  name: string;
  /** 商品描述 */
  description?: string;
  /** 商品图片 */
  image?: string;
  /** 商品价格 */
  price?: string;
  /** 货币单位 */
  currency?: string;
  /** 来源类型 */
  sourceType: SourceType;
  /** 相关度分数 */
  relevanceScore: number;
}

/**
 * 搜索响应数据
 */
export interface SearchProductsResponse
  extends PaginatedResponse<SearchResultItem> {
  /** 搜索关键词 */
  query: string;
}

/**
 * 搜索建议项
 */
export interface SearchSuggestion {
  /** 建议关键词 */
  text: string;
  /** 搜索结果数量 */
  count: number;
}

/**
 * 搜索建议列表响应
 */
export type SearchSuggestionsResponse = SearchSuggestion[];

// ============================================
// Health 健康检查相关响应
// ============================================

/**
 * 健康检查响应
 */
export interface HealthResponse {
  /** 服务状态 */
  status: 'ok' | 'error';
  /** 服务名称 */
  service?: string;
  /** 版本信息 */
  version?: string;
  /** 时间戳 */
  timestamp: string;
}
