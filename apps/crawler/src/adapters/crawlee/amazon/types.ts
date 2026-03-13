/**
 * Amazon Crawler 类型定义
 */

import type { AmazonProduct } from "../../../domain/types/index.js";

/**
 * Amazon 搜索结果
 */
export interface AmazonSearchResult {
  /** 搜索关键词 */
  keyword: string;
  /** 商品列表 */
  products: AmazonProduct[];
  /** 搜索成功状态 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * Amazon 爬取选项
 */
export interface AmazonCrawlOptions {
  /** 亚马逊域名 */
  domain?: string;
  /** 搜索间隔 (毫秒) */
  delay?: number;
  /** 是否无头模式 */
  headless?: boolean;
  /** 最大结果数 */
  maxResults?: number;
}
