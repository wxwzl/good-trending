/**
 * 昨天数据统计任务 - 调度配置
 * 合并类目热度和商品发现
 */

import type { YesterdayStatsConfig } from "./types.js";

/**
 * 任务调度配置
 */
export const YESTERDAY_STATS_SCHEDULE = {
  name: "yesterday-stats",
  cron: "0 2 * * *", // 每天凌晨2点执行
  enabled: true,
  description: "合并爬取昨天类目热度和商品数据",
};

/**
 * 任务默认配置
 */
export const YESTERDAY_STATS_CONFIG = {
  defaults: {
    headless: true,
    maxResultsPerCategory: 30,
    maxProductsPerCategory: 10,
    searchDelayRange: [5000, 10000] as [number, number],
    saveToDb: true,
  } satisfies YesterdayStatsConfig,
};
