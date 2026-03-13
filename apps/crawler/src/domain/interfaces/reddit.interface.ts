/**
 * Reddit 接口
 * 抽象 Reddit 内容提取功能，与具体实现解耦
 */

import type { RedditPost } from "../types/index.js";

/**
 * Reddit 接口
 * 定义所有 Reddit 爬虫实现必须遵循的契约
 */
export interface IReddit {
  /**
   * 获取帖子内容
   * @param url 帖子 URL
   * @returns 帖子数据，如果获取失败返回 null
   */
  fetchPost(url: string): Promise<RedditPost | null>;

  /**
   * 提取 Amazon 链接（可选功能）
   * @param url 帖子 URL
   * @returns Amazon 链接列表
   */
  extractAmazonLinks?(url: string): Promise<string[]>;

  /**
   * 关闭资源
   * 释放浏览器、连接等资源
   */
  close(): Promise<void>;
}

/**
 * Reddit 接口标识符（用于依赖注入）
 */
export const REDDIT_TOKEN = Symbol("IReddit");
