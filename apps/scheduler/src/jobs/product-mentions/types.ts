/**
 * 商品提及统计任务 - 类型定义
 * 统计商品在 Reddit 和 X 平台的提及次数
 */

/**
 * 商品提及统计配置
 */
export interface ProductMentionsConfig {
  /** 是否无头模式 */
  headless?: boolean;
  /** 最大处理商品数 */
  maxProducts?: number;
  /** 是否保存到数据库 */
  saveToDb?: boolean;
}

/**
 * 商品信息
 */
export interface ProductInfo {
  id: string;
  name: string;
  amazonId?: string;
}

/**
 * 提及统计结果
 */
export interface MentionStats {
  today: { reddit: number; x: number };
  yesterday: { reddit: number; x: number };
  thisWeek: { reddit: number; x: number };
  thisMonth: { reddit: number; x: number };
  last7Days: { reddit: number; x: number };
  last15Days: { reddit: number; x: number };
  last30Days: { reddit: number; x: number };
  last60Days: { reddit: number; x: number };
}

/**
 * 商品提及结果
 */
export interface ProductMentionResult {
  productId: string;
  productName: string;
  stats: MentionStats;
}

/**
 * 爬虫执行结果
 */
export interface ProductMentionsCrawlResult {
  success: boolean;
  results: ProductMentionResult[];
  errors: string[];
  duration: number;
}
