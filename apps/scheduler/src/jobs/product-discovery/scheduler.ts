/**
 * 商品发现任务 - 调度配置
 */

import type { ProductDiscoveryConfig } from "./types.js";

/**
 * 任务调度配置
 */
export const PRODUCT_DISCOVERY_SCHEDULE = {
  name: "product-discovery",
  cron: "0 */2 * * *", // 每2小时执行一次
  enabled: true,
  description: "从 Reddit 搜索发现亚马逊商品",
};

/**
 * 任务默认配置
 */
export const PRODUCT_DISCOVERY_CONFIG = {
  defaults: {
    headless: true,
    maxResultsPerCategory: 30,
    maxProductsPerCategory: 10,
    searchDelayRange: [5000, 10000] as [number, number],
    saveToDb: true,
  } satisfies ProductDiscoveryConfig,
};
