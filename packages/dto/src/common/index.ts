/**
 * @good-trending/dto/common
 *
 * 公共类型定义模块
 * 包含枚举、接口基类等前后端共享的基础类型
 */

/**
 * 数据来源类型枚举
 * 标识商品数据的来源平台
 */
export enum SourceType {
  /** X 平台（原 Twitter） */
  X_PLATFORM = "X_PLATFORM",
  /** 亚马逊 */
  AMAZON = "AMAZON",
}

/**
 * 时间范围枚举
 * 用于趋势数据的时间筛选
 */
export enum Period {
  /** 每日 */
  DAILY = "daily",
  /** 每周 */
  WEEKLY = "weekly",
  /** 每月 */
  MONTHLY = "monthly",
}

/**
 * 分页请求参数基类
 * 所有分页接口的请求参数都应继承或实现此接口
 */
export interface PaginationParams {
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页数量 */
  limit?: number;
}

/**
 * 分页响应数据基类
 * 所有分页接口的响应数据都应使用此格式
 *
 * @template T 列表项的数据类型
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * API 统一响应格式
 * 用于包装所有 API 响应
 *
 * @template T 响应数据的类型
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 提示消息 */
  message?: string;
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  /** 升序 */
  ASC = "asc",
  /** 降序 */
  DESC = "desc",
}
