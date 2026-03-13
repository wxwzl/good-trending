/**
 * Amazon 搜索接口
 * 抽象 Amazon 搜索功能，与具体实现解耦
 */

import type { AmazonProduct } from "../types/index.js";

/**
 * Amazon 搜索接口
 * 定义所有 Amazon 搜索实现必须遵循的契约
 */
export interface IAmazonSearch {
  /**
   * 根据关键词搜索商品
   * @param keyword 搜索关键词
   * @returns 商品列表
   */
  searchByKeyword(keyword: string): Promise<AmazonProduct[]>;

  /**
   * 从商品详情页 URL 提取商品信息
   * @param url 商品详情页 URL
   * @returns 商品信息
   */
  extractProductInfoFromUrl(url: string): Promise<AmazonProduct | null>;

  /**
   * 关闭资源
   * 释放浏览器、连接等资源
   */
  close(): Promise<void>;
}

/**
 * Amazon 搜索接口标识符（用于依赖注入）
 */
export const AMAZON_SEARCH_TOKEN = Symbol("IAmazonSearch");
