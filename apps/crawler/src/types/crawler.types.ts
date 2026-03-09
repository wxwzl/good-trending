/**
 * 爬虫类型定义
 * 根据 dataStructure.md 定义的数据结构
 */

import type { SourceType } from "@good-trending/database";

/**
 * 爬虫任务类型
 */
export type CrawlerTaskType =
  | "CATEGORY_HEAT"      // 类目热度统计
  | "PRODUCT_DISCOVERY"  // 商品发现
  | "PRODUCT_MENTION"    // 商品社交提及统计
  | "YESTERDAY_STATS";   // 昨天数据统计

/**
 * 爬虫状态
 */
export type CrawlerStatus = "RUNNING" | "COMPLETED" | "FAILED";

/**
 * 周期类型
 */
export type PeriodType =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "LAST_60_DAYS";

/**
 * 搜索平台
 */
export type SearchPlatform = "REDDIT" | "X_PLATFORM";

/**
 * 类目数据
 */
export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  searchKeywords?: string;
}

/**
 * 类目热度结果
 */
export interface CategoryHeatResult {
  categoryId: string;
  categoryName: string;
  statDate: Date;
  redditResultCount: number;
  xResultCount: number;
  yesterdayRedditCount?: number;
  yesterdayXCount?: number;
  last7DaysRedditCount?: number;
  last7DaysXCount?: number;
}

/**
 * 爬取到的商品数据
 */
export interface CrawledProduct {
  name: string;
  description?: string;
  price?: number;
  currency: string;
  /** 亚马逊商品ID (ASIN) */
  amazonId: string;
  sourceUrl: string;
  /** 从哪个类目发现的 */
  discoveredFromCategory: string;
  /** 发现日期 */
  firstSeenAt: Date;
}

/**
 * 商品社交提及统计
 */
export interface ProductMentionStat {
  productId: string;
  productName: string;
  statDate: Date;
  todayRedditCount: number;
  todayXCount: number;
  yesterdayRedditCount: number;
  yesterdayXCount: number;
  thisWeekRedditCount: number;
  thisWeekXCount: number;
  thisMonthRedditCount: number;
  thisMonthXCount: number;
  last7DaysRedditCount: number;
  last7DaysXCount: number;
  last15DaysRedditCount: number;
  last15DaysXCount: number;
  last30DaysRedditCount: number;
  last30DaysXCount: number;
  last60DaysRedditCount: number;
  last60DaysXCount: number;
}

/**
 * 搜索结果中的商品链接
 */
export interface SearchResultLink {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Google 搜索结果
 */
export interface GoogleSearchResult {
  /** 搜索结果总数 */
  totalResults: number;
  /** 结果链接列表 */
  links: SearchResultLink[];
  /** 搜索查询 */
  query: string;
}

/**
 * 亚马逊商品信息（从搜索结果页面提取）
 */
export interface AmazonProductInfo {
  asin: string;
  name: string;
  url: string;
  price?: string;
  image?: string;
}

/**
 * 爬虫日志数据
 */
export interface CrawlerLogData {
  taskType: CrawlerTaskType;
  sourceType: SourceType;
  categoryId?: string;
  status: CrawlerStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsFound: number;
  itemsSaved: number;
  errors?: Array<{ message: string; stack?: string }>;
  metadata?: Record<string, unknown>;
}

/**
 * 爬虫执行结果
 */
export interface CrawlerExecutionResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * 爬虫配置
 */
export interface CrawlerConfig {
  /** 无头模式 */
  headless?: boolean;
  /** 请求延迟 (毫秒) */
  requestDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 代理地址 */
  proxy?: string;
}

/**
 * 类目爬取配置
 */
export interface CategoryCrawlConfig {
  /** 同时处理的类目数 */
  concurrency?: number;
  /** 每个类目最大爬取结果数 */
  maxResultsPerCategory?: number;
  /** 每个类目提取的最大商品数 */
  maxProductsPerCategory?: number;
  /** 搜索延迟范围 (毫秒) */
  searchDelayRange?: [number, number];
}

// ==================== Bitmap 工具函数 ====================

/**
 * 更新位图（滑动窗口）
 * @param bitmap 当前位图值
 * @param windowSize 窗口大小（7/15/30/60）
 * @param appearedToday 今天是否出现
 * @returns 更新后的位图值
 */
export function updateBitmap(
  bitmap: number,
  windowSize: number,
  appearedToday: boolean
): number {
  // 左移一位
  let newBitmap = bitmap << 1;

  // 屏蔽超出窗口大小的位
  const mask = (1 << windowSize) - 1;
  newBitmap = newBitmap & mask;

  // 设置今天的状态
  if (appearedToday) {
    newBitmap = newBitmap | 1;
  }

  return newBitmap;
}

/**
 * 计算位图中 1 的个数（出现次数）
 * @param bitmap 位图值
 * @returns 出现次数
 */
export function countBitmap(bitmap: number): number {
  let count = 0;
  let n = bitmap;

  while (n > 0) {
    n = n & (n - 1);
    count++;
  }

  return count;
}

/**
 * 将位图转换为二进制字符串
 * @param bitmap 位图值
 * @param length 字符串长度
 * @returns 二进制字符串
 */
export function bitmapToString(bitmap: number, length: number = 30): string {
  return bitmap.toString(2).padStart(length, "0");
}
