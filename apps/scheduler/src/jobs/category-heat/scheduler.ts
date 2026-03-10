/**
 * 类目热度任务 - 调度配置
 */

import type { CategoryHeatConfig } from "./types.js";

/**
 * 任务调度配置
 */
export const CATEGORY_HEAT_SCHEDULE = {
  name: "category-heat",
  cron: "0 */2 * * *", // 每2小时执行一次
  enabled: true,
  description: "爬取各平台类目热度数据",
};

/**
 * 任务默认配置
 */
export const CATEGORY_HEAT_CONFIG = {
  defaults: {
    headless: true,
    maxResultsPerCategory: 30,
    searchDelayRange: [5000, 10000] as [number, number],
    saveToDb: true,
  } satisfies CategoryHeatConfig,
};
