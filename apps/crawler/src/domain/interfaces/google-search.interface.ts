/**
 * Google 搜索接口
 * 抽象 Google 搜索功能，与具体实现解耦
 */

import type { Page } from "playwright";
import type { SearchResponse } from "../types/index.js";

/**
 * Google 搜索接口
 * 定义所有 Google 搜索实现必须遵循的契约
 */
export interface IGoogleSearch {
  /**
   * 执行搜索
   * @param query 搜索关键词
   * @param externalPage 可选的外部 Playwright Page 实例（用于复用浏览器）
   * @returns 搜索结果
   */
  search(query: string, externalPage?: Page): Promise<SearchResponse>;

  /**
   * 关闭资源
   * 释放浏览器、连接等资源
   */
  close(): Promise<void>;
}

/**
 * Google 搜索接口标识符（用于依赖注入）
 */
export const GOOGLE_SEARCH_TOKEN = Symbol("IGoogleSearch");
