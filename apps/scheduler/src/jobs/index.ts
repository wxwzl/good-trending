/**
 * 任务模块统一导出
 * 所有调度任务在这里注册
 */

import type { Job } from "bullmq";
import type { CrawlerJobData, CrawlerJobResult } from "../queue/index.js";

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

/**
 * 注册的任务列表
 * 新增任务时在这里添加
 */
export const REGISTERED_JOBS = [
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
] as const;

/**
 * 获取任务处理器
 */
export function getJobProcessor(
  name: string
): ((job: Job<CrawlerJobData>) => Promise<CrawlerJobResult>) | undefined {
  const job = REGISTERED_JOBS.find((j) => j.name === name);
  return job?.processor;
}

/**
 * 获取所有启用的任务
 */
export function getEnabledJobs() {
  return REGISTERED_JOBS.filter((j) => j.enabled);
}

/**
 * 检查任务是否存在
 */
export function hasJob(name: string): boolean {
  return REGISTERED_JOBS.some((j) => j.name === name);
}

// 导出各个任务模块
export * from "./ai-product-discovery/index.js";
