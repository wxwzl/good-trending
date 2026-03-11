/**
 * API 类型定义
 *
 * 本文件从 @good-trending/dto 包重新导出类型
 * 供前端项目使用
 */

export type {
  // 公共类型
  SourceType,
  Period,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  SortOrder,
} from "@good-trending/dto/common";

export type {
  // 请求参数
  GetProductsRequest,
  CreateProductRequest,
  UpdateProductRequest,
  GetTopicsRequest,
  GetTopicProductsRequest,
  CreateTopicRequest,
  UpdateTopicRequest,
  GetTrendingRequest,
  SearchProductsRequest,
  GetSearchSuggestionsRequest,
} from "@good-trending/dto/request";

export type {
  // 响应数据
  ProductBase,
  ProductResponse,
  PaginatedProductsResponse,
  TopicBase,
  TopicWithProductCount,
  TopicResponse,
  PaginatedTopicsResponse,
  PaginatedTopicProductsResponse,
  TrendingItem,
  PaginatedTrendingResponse,
  SearchResultItem,
  SearchProductsResponse,
  SearchSuggestion,
  SearchSuggestionsResponse,
  HealthResponse,
} from "@good-trending/dto/response";

// 为了保持向后兼容，重导出常用类型
export type { ProductResponse as Product } from "@good-trending/dto/response";
export type { TopicResponse as Topic } from "@good-trending/dto/response";

// 统计数据相关类型
export type {
  ProductSocialStatsResponse,
  ProductAppearanceStatsResponse,
  ProductTrendHistoryResponse,
  TopicHeatStatsResponse,
  SocialPlatformStats,
  ProductTrendHistoryItem,
  CategoryHeatTrendItem,
} from "@good-trending/dto/response";
