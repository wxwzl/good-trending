/**
 * Google 搜索 Crawlee 类型
 */

import type { SearchResult } from "../../../domain/types/index.js";

/**
 * Google 搜索结果（带位置信息）
 */
export interface GoogleSearchResult extends SearchResult {
  /** 结果位置（1-10） */
  position: number;
}

/**
 * Google 搜索选项
 */
export interface GoogleSearchOptions {
  /** 搜索查询 */
  query: string;
  /** 最大结果数 */
  maxResults?: number;
  /** 搜索标签 */
  label?: string;
}
