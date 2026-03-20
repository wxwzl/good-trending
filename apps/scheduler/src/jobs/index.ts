/**
 * 任务模块统一导出
 * 所有调度任务在这里注册
 */

import type { Job } from "bullmq";
import type {
  CrawlerJobData,
  CrawlerJobResult,
  TrendingJobData,
  TrendingJobResult,
} from "../queue/index.js";

// 导入 AI 商品发现任务
import {
  AI_PRODUCT_DISCOVERY_JOB_NAME,
  AI_PRODUCT_DISCOVERY_CRON,
  AI_PRODUCT_DISCOVERY_CONFIG,
  processAIProductDiscoveryJob,
} from "./ai-product-discovery/index.js";

// 导入类目热度任务
import { CATEGORY_HEAT_SCHEDULE, processCategoryHeatJob } from "./category-heat/index.js";

// 导入商品发现任务
import {
  PRODUCT_DISCOVERY_SCHEDULE,
  processProductDiscoveryJob,
} from "./product-discovery/index.js";

// 导入昨天数据统计任务
import { YESTERDAY_STATS_SCHEDULE, processYesterdayStatsJob } from "./yesterday-stats/index.js";

// 导入商品提及统计任务
import { PRODUCT_MENTIONS_SCHEDULE, processProductMentionsJob } from "./product-mentions/index.js";

// 导入数据清理任务
import { DATA_CLEANUP_SCHEDULE, processDataCleanupJob } from "./data-cleanup/index.js";

// 导入趋势任务
import {
  TRENDING_CALCULATE_SCHEDULE,
  processTrendingCalculateJob,
} from "./trending-calculate/index.js";
import { TRENDING_UPDATE_SCHEDULE, processTrendingUpdateJob } from "./trending-update/index.js";

/**
 * 爬虫队列任务列表（走 crawler-queue）
 */
export const CRAWLER_JOBS = [
  {
    name: AI_PRODUCT_DISCOVERY_JOB_NAME,
    cron: AI_PRODUCT_DISCOVERY_CRON,
    enabled: AI_PRODUCT_DISCOVERY_CONFIG.enabled,
    processor: processAIProductDiscoveryJob,
  },
  {
    name: CATEGORY_HEAT_SCHEDULE.name,
    cron: CATEGORY_HEAT_SCHEDULE.cron,
    enabled: CATEGORY_HEAT_SCHEDULE.enabled,
    processor: processCategoryHeatJob,
  },
  {
    name: PRODUCT_DISCOVERY_SCHEDULE.name,
    cron: PRODUCT_DISCOVERY_SCHEDULE.cron,
    enabled: PRODUCT_DISCOVERY_SCHEDULE.enabled,
    processor: processProductDiscoveryJob,
  },
  {
    name: YESTERDAY_STATS_SCHEDULE.name,
    cron: YESTERDAY_STATS_SCHEDULE.cron,
    enabled: YESTERDAY_STATS_SCHEDULE.enabled,
    processor: processYesterdayStatsJob,
  },
  {
    name: PRODUCT_MENTIONS_SCHEDULE.name,
    cron: PRODUCT_MENTIONS_SCHEDULE.cron,
    enabled: PRODUCT_MENTIONS_SCHEDULE.enabled,
    processor: processProductMentionsJob,
  },
  {
    name: DATA_CLEANUP_SCHEDULE.name,
    cron: DATA_CLEANUP_SCHEDULE.cron,
    enabled: DATA_CLEANUP_SCHEDULE.enabled,
    processor: processDataCleanupJob,
  },
] as const;

/**
 * 趋势队列任务列表（走 trending-queue）
 */
export const TRENDING_JOBS = [
  {
    name: TRENDING_CALCULATE_SCHEDULE.name,
    cron: TRENDING_CALCULATE_SCHEDULE.cron,
    enabled: TRENDING_CALCULATE_SCHEDULE.enabled,
    processor: processTrendingCalculateJob,
  },
  {
    name: TRENDING_UPDATE_SCHEDULE.name,
    cron: TRENDING_UPDATE_SCHEDULE.cron,
    enabled: TRENDING_UPDATE_SCHEDULE.enabled,
    processor: processTrendingUpdateJob,
  },
] as const;

/**
 * @deprecated 使用 CRAWLER_JOBS 替代
 * 保留兼容性，等同于 CRAWLER_JOBS
 */
export const REGISTERED_JOBS = CRAWLER_JOBS;

/**
 * 获取爬虫队列任务处理器
 */
export function getCrawlerJobProcessor(
  name: string
): ((job: Job<CrawlerJobData>) => Promise<CrawlerJobResult>) | undefined {
  const job = CRAWLER_JOBS.find((j) => j.name === name);
  return job?.processor;
}

/**
 * 获取趋势队列任务处理器
 */
export function getTrendingJobProcessor(
  name: string
): ((job: Job<TrendingJobData>) => Promise<TrendingJobResult>) | undefined {
  const job = TRENDING_JOBS.find((j) => j.name === name);
  return job?.processor;
}

/**
 * 获取所有启用的爬虫任务
 */
export function getEnabledCrawlerJobs() {
  return CRAWLER_JOBS.filter((j) => j.enabled);
}

/**
 * 获取所有启用的趋势任务
 */
export function getEnabledTrendingJobs() {
  return TRENDING_JOBS.filter((j) => j.enabled);
}

/**
 * @deprecated 使用 getEnabledCrawlerJobs 替代
 */
export function getEnabledJobs() {
  return getEnabledCrawlerJobs();
}

/**
 * 检查任务是否存在（爬虫或趋势）
 */
export function hasJob(name: string): boolean {
  return CRAWLER_JOBS.some((j) => j.name === name) || TRENDING_JOBS.some((j) => j.name === name);
}

// 导出各个任务模块
export * from "./ai-product-discovery/index.js";
export * from "./trending-calculate/index.js";
export * from "./trending-update/index.js";
