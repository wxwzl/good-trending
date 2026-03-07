// 来源类型枚举
export enum SourceType {
  X_PLATFORM = "X_PLATFORM",
  AMAZON = "AMAZON",
}

// 商品基础类型
export interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: SourceType;
  createdAt: Date;
  updatedAt: Date;
}

// 趋势记录类型
export interface Trend {
  id: string;
  productId: string;
  date: Date;
  rank: number;
  score: number;
  mentions: number;
  views: number;
  likes: number;
  sourceData?: Record<string, unknown>;
  createdAt: Date;
}

// 分类/Topics 类型
export interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 爬虫日志类型
export interface CrawlerLog {
  id: string;
  sourceType: SourceType;
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
