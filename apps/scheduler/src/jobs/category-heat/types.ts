/**
 * 类目热度任务 - 类型定义
 */

/**
 * 类目热度配置
 */
export interface CategoryHeatConfig {
  /** 是否无头模式 */
  headless?: boolean;
  /** 每个类目最大结果数 */
  maxResultsPerCategory?: number;
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
 * 爬虫执行结果
 */
export interface CategoryHeatCrawlResult {
  success: boolean;
  data: CategoryHeatResult[];
  total: number;
  errors: string[];
  duration: number;
}
