/**
 * AI 商品发现任务类型定义
 */

/**
 * 亚马逊商品信息（本地定义避免导入问题）
 */
export interface AmazonProduct {
  /** 商品名称 */
  name: string;
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
 * 任务配置
 */
export interface AIProductDiscoveryConfig {
  /** 是否启用无头模式 */
  headless: boolean;
  /** 最大搜索类目数 */
  maxCategories: number;
  /** 每个关键词搜索的商品数 */
  productsPerKeyword: number;
  /** 是否保存到数据库 */
  saveToDb: boolean;
}

/**
 * 爬取结果
 */
export interface AIProductDiscoveryResult {
  /** 处理的帖子数 */
  postsProcessed: number;
  /** 提取的关键词数 */
  keywordsExtracted: number;
  /** 发现的商品数 */
  productsFound: number;
  /** 保存的商品数 */
  productsSaved: number;
  /** 错误数 */
  errorCount: number;
  /** 耗时 (毫秒) */
  duration: number;
}

/**
 * 爬取的商品（带来源信息）
 */
export interface DiscoveredProduct extends AmazonProduct {
  /** 来源 Reddit 帖子 URL */
  sourcePostUrl: string;
  /** 提取该商品的关键词 */
  extractedKeyword: string;
  /** 发现的类目ID */
  categoryId: string;
}

/**
 * Reddit 帖子与提取结果
 */
export interface ProcessedPost {
  /** 帖子 URL */
  url: string;
  /** 帖子标题 */
  title: string;
  /** 提取的关键词 */
  keywords: string[];
  /** 从该帖子发现的商品 */
  products: DiscoveredProduct[];
}
