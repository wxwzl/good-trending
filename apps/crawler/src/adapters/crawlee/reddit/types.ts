/**
 * Reddit Crawlee 类型定义
 */

import type { RedditPost } from "../../../domain/types/index.js";

/**
 * Reddit 爬取选项
 */
export interface RedditCrawlOptions {
  /** 帖子 URL */
  url: string;
  /** 最大评论数 */
  maxComments?: number;
  /** 是否展开评论 */
  expandComments?: boolean;
}

/**
 * Reddit 帖子数据（内部格式，包含 Crawlee 元数据）
 */
export interface RedditPostData extends RedditPost {
  /** 爬取时间 */
  crawledAt?: string;
}
