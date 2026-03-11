/**
 * 商品提及统计任务 - 调度配置
 * 统计商品在 Reddit 和 X 平台的提及次数
 */

import type { ProductMentionsConfig } from "./types.js";

/**
 * 任务调度配置
 */
export const PRODUCT_MENTIONS_SCHEDULE = {
  name: "product-mentions",
  cron: "0 */4 * * *", // 每4小时执行一次
  enabled: true,
  description: "统计商品在社交平台上的提及次数",
};

/**
 * 任务默认配置
 */
export const PRODUCT_MENTIONS_CONFIG = {
  defaults: {
    headless: true,
    maxProducts: 50,
    saveToDb: true,
  } satisfies ProductMentionsConfig,
};
