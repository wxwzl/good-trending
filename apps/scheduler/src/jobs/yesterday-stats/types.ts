/**
 * 昨天数据统计任务 - 类型定义
 * 合并类目热度和商品发现，一次遍历同时处理
 */

/**
 * 昨天统计配置
 */
export interface YesterdayStatsConfig {
  /** 是否无头模式 */
  headless?: boolean;
  /** 每个类目最大结果数 */
  maxResultsPerCategory?: number;
  /** 每个类目最大商品数 */
  maxProductsPerCategory?: number;
  /** 搜索延迟范围 (毫秒) */
  searchDelayRange?: [number, number];
  /** 是否保存到数据库 */
  saveToDb?: boolean;
}

/**
 * 类目数据
 */
export interface CategoryData {
  id: string;
  name: string;
  searchKeywords?: string | null;
}

/**
 * 类目热度结果
 */
export interface CategoryHeatResult {
  categoryId: string;
  categoryName: string;
  statDate: Date;
  redditResultCount: number;
  xResultCount: number;
}

/**
 * 发现的商品
 */
export interface DiscoveredProduct {
  amazonId: string;
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  url: string;
  discoveredFromCategory: string;
  firstSeenAt: Date;
}

/**
 * 爬虫执行结果
 */
export interface YesterdayStatsResult {
  success: boolean;
  heatResults: CategoryHeatResult[];
  products: DiscoveredProduct[];
  errors: string[];
  duration: number;
}
