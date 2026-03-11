/**
 * 商品发现任务 - 调度配置
 */

import type { ProductDiscoveryConfig } from "./types.js";

/**
 * 任务调度配置
 * 仅在未启用 AI 分析时启用（与 ai-product-discovery 互斥）
 */
export const PRODUCT_DISCOVERY_SCHEDULE = {
  name: "product-discovery",
  cron: "0 */2 * * *", // 每2小时执行一次
  enabled: process.env.ENABLE_AI_ANALYSIS !== "true",
  description: "从 Reddit 搜索发现亚马逊商品（传统方式，AI分析未启用时使用）",
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
