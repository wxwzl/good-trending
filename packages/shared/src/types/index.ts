/**
 * Shared types package
 * @deprecated 推荐使用 @good-trending/dto 包中的类型定义
 */

// 从 @good-trending/dto 重新导出共享类型
export {
  SourceType,
  Period,
  SortOrder,
  type PaginationParams,
  type PaginatedResponse,
  type ApiResponse,
} from "@good-trending/dto/common";

// 从 @good-trending/dto 重新导出请求类型
export type {
  GetProductsRequest,
  CreateProductRequest,
  UpdateProductRequest,
  GetTrendingRequest,
  SearchProductsRequest,
} from "@good-trending/dto/request";

// 从 @good-trending/dto 重新导出响应类型
export type {
  ProductResponse as Product,
  TrendingItem as Trend,
  TopicResponse as Topic,
  PaginatedProductsResponse,
  PaginatedTrendingResponse,
  PaginatedTopicsResponse,
} from "@good-trending/dto/response";

// ==== 以下类型是 shared 包特有的，仅在内部使用 ====

/**
 * 标签类型
 * 用于商品标签系统（内部使用）
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

/**
 * 爬虫日志类型
 * 用于爬虫执行记录（内部使用）
 */
export interface CrawlerLog {
  id: string;
  sourceType: import("@good-trending/dto/common").SourceType;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsFound: number;
  itemsSaved: number;
  errors?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
