/**
 * 商品发现任务 - 类型定义
 * 基于类目搜索发现亚马逊商品
 */

/**
 * 商品发现配置
 */
export interface ProductDiscoveryConfig {
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
export interface ProductDiscoveryResult {
  success: boolean;
  data: DiscoveredProduct[];
  total: number;
  errors: string[];
  duration: number;
}
