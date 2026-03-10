/**
 * 类型定义
 * 集中管理所有类型定义
 */
import type { Job } from "bullmq";
import type { CrawlerJobData, CrawlerJobResult } from "../queue/index.js";

/**
 * 爬虫实例类型
 * 使用宽松类型定义，因为实际类型由 @good-trending/crawler 提供
 */
export type CrawlerInstance = {
  closeBrowser: () => Promise<void>;
  crawlCategoryHeat: (categories: unknown[]) => Promise<unknown>;
  crawlProductsByCategory: (categories: unknown[]) => Promise<unknown>;
  crawlProductMentions: (productName: string, date: Date) => Promise<unknown>;
  crawlYesterdayCategoryHeat: (categories: unknown[]) => Promise<unknown>;
  crawlYesterdayProducts: (categories: unknown[]) => Promise<unknown>;
  crawlCategoryHeatAndProducts: (categories: unknown[]) => Promise<unknown>;
  [key: string]: unknown;
};

/**
 * 爬虫任务处理器接口
 * 策略模式接口定义
 */
export interface CrawlerJobHandler {
  /** 处理器类型 */
  readonly type: string;
  /** 处理器名称 */
  readonly name: string;
  /** 执行处理 */
  execute(job: Job<CrawlerJobData>): Promise<CrawlerJobResult>;
}

/**
 * 任务调度器状态
 */
export interface SchedulerState {
  running: boolean;
  jobs: Map<string, import("node-cron").ScheduledTask>;
}

/**
 * Redis 配置
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: number | null;
}

/**
 * 应用状态
 */
export interface AppState {
  running: boolean;
  startTime: Date | null;
}

/**
 * 周期类型
 */
export type PeriodType =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "LAST_60_DAYS";
