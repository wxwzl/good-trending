/**
 * 爬虫领域类型定义
 * 所有爬虫实现共享的类型定义
 *
 * 注意：RedditPost 类型必须与 AI 分析服务兼容
 * AI 分析器只读取 title, content, comments 字段
 */
/**
 * 亚马逊商品信息
 */
export interface AmazonProduct {
  /** 商品名称 */
  name: string;
  /** 商品描述 */
  description?: string;
  /** 商品价格 */
  price?: number;
  /** 货币 */
  currency: string;
  /** 亚马逊商品ID (ASIN) */
  asin: string;
  /** 商品链接 */
  url: string;
  /** 商品主图 */
  image?: string;
  /** 评分 */
  rating?: number;
  /** 评价数量 */
  reviewCount?: number;
}
/**
 * Reddit 帖子数据
 * 与 services/ai/ai-analyzer.interface.ts 中的定义兼容
 */
export interface RedditPost {
  /** 帖子标题 */
  title: string;
  /** 帖子内容（可能为空） */
  content?: string;
  /** 评论列表 */
  comments: string[];
  /** 帖子 URL */
  url: string;
  /** 作者 */
  author?: string;
  /** 发布时间（ISO 8601 格式） */
  postedAt?: string;
  /** 点赞数 */
  upvotes?: number;
}

/**
 * AI 分析结果
 * 与 services/ai/ai-analyzer.interface.ts 中的定义兼容
 */
export interface AIAnalysisResult {
  /** 提取的商品关键词列表 */
  keywords: string[];
  /** 分析的原始内容摘要（用于调试） */
  summary?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 结果标题 */
  title: string;
  /** 结果 URL */
  url: string;
  /** 结果摘要 */
  snippet?: string;
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  /** 是否成功 */
  success: boolean;
  /** 总结果数 */
  totalResults: number;
  /** 结果列表 */
  links: SearchResult[];
  /** 数据来源 */
  source: "serpapi" | "browser";
  /** 错误信息（如果有） */
  error?: string;
}
