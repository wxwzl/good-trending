/**
 * @good-trending/dto/request
 *
 * 请求参数类型定义模块
 * 包含所有 API 接口的请求参数类型
 */

import { PaginationParams, SourceType } from "../common";

// ============================================
// Product 商品相关请求
// ============================================

/**
 * 获取商品列表请求参数
 */
export interface GetProductsRequest extends PaginationParams {
  /** 数据来源筛选 */
  discoveredFrom?: SourceType;
  /** 分类 ID 筛选 */
  categoryId?: string;
}

/**
 * 创建商品请求参数
 */
export interface CreateProductRequest {
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
  /** 亚马逊商品 ID (ASIN) */
  amazonId: string;
  /** 数据来源平台（从哪里发现的） */
  discoveredFrom: SourceType;
}

/**
 * 更新商品请求参数
 */
export interface UpdateProductRequest {
  /** 商品名称 */
  name?: string;
  /** 商品描述 */
  description?: string;
  /** 商品图片 URL */
  image?: string;
  /** 商品价格 */
  price?: string;
  /** 货币单位 */
  currency?: string;
}

// ============================================
// Topic 分类相关请求
// ============================================

/**
 * 获取分类列表请求参数
 */
export interface GetTopicsRequest extends PaginationParams {}

/**
 * 获取分类下商品请求参数
 */
export interface GetTopicProductsRequest extends PaginationParams {}

/**
 * 创建分类请求参数
 */
export interface CreateTopicRequest {
  /** 分类名称 */
  name: string;
  /** 分类 slug */
  slug: string;
  /** 分类描述 */
  description?: string;
  /** 分类图片 URL */
  imageUrl?: string;
  /** 搜索关键词（用于 Google 搜索） */
  searchKeywords?: string;
}

/**
 * 更新分类请求参数
 */
export interface UpdateTopicRequest {
  /** 分类名称 */
  name?: string;
  /** 分类描述 */
  description?: string;
  /** 分类图片 URL */
  imageUrl?: string;
  /** 搜索关键词（用于 Google 搜索） */
  searchKeywords?: string;
}

// ============================================
// Trending 趋势相关请求
// ============================================

/**
 * 获取趋势数据请求参数
 */
export interface GetTrendingRequest extends PaginationParams {
  /** 时间范围: TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, LAST_7_DAYS, LAST_15_DAYS, LAST_30_DAYS */
  period?: string;
  /** 分类 ID 筛选 */
  categoryId?: string;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
}

// ============================================
// Search 搜索相关请求
// ============================================

/**
 * 搜索商品请求参数
 */
export interface SearchProductsRequest extends PaginationParams {
  /** 搜索关键词 */
  q: string;
  /** 数据来源筛选 */
  discoveredFrom?: SourceType;
  /** 分类 ID 筛选 */
  categoryId?: string;
}

/**
 * 获取搜索建议请求参数
 */
export interface GetSearchSuggestionsRequest {
  /** 输入的关键词 */
  keyword: string;
}
