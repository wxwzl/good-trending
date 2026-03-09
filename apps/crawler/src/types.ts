/**
 * 爬虫模块类型定义
 * 注意：SourceType 统一从 @good-trending/database 导入
 */

// Note: SourceType 已统一从 @good-trending/database 导入
// 使用时请导入: import { SourceType } from "@good-trending/database";

/**
 * 爬虫执行选项
 */
export interface CrawlOptions {
  /** 数据源 */
  source: "twitter" | "amazon" | "all";
  /** 是否保存到数据库 */
  saveToDb?: boolean;
  /** 最大商品数量 */
  maxItems?: number;
  /** 是否启用无头模式 */
  headless?: boolean;
  /** 代理地址 */
  proxy?: string;
}

/**
 * 商品原始数据
 */
export interface RawProductData {
  /** 商品名称 */
  name: string;
  /** 商品描述 */
  description?: string;
  /** 图片 URL */
  imageUrl?: string;
  /** 价格 */
  price?: string;
  /** 货币 */
  currency?: string;
  /** 来源 URL */
  sourceUrl: string;
  /** 来源 ID */
  sourceId: string;
}

/**
 * 趋势数据
 */
export interface TrendData {
  /** 商品 ID */
  productId: string;
  /** 日期 */
  date: string;
  /** 排名 */
  rank: number;
  /** 分数 */
  score: number;
  /** 提及次数 */
  mentions?: number;
  /** 浏览次数 */
  views?: number;
  /** 点赞数 */
  likes?: number;
  /** 来源数据 */
  sourceData?: Record<string, unknown>;
}

// Note: 爬虫日志类型已统一到 crawler.types.ts 中的 CrawlerLogData
// 使用时请导入: import { CrawlerLogData } from "./types/crawler.types"
