/**
 * 数据清理任务 - 调度配置
 * 每天清理3年前的社交统计数据分区
 */

import type { DataCleanupConfig } from "./types.js";

/**
 * 任务调度配置
 * 每天凌晨5点执行（在统计任务完成后）
 */
export const DATA_CLEANUP_SCHEDULE = {
  name: "data-cleanup",
  cron: "0 5 * * *",
  enabled: true,
  description: "清理3年前的商品社交统计数据分区",
};

/**
 * 任务默认配置
 */
export const DATA_CLEANUP_CONFIG = {
  defaults: {
    // 保留36个月（3年）
    retentionMonths: 36,
    // 目标表名
    targetTable: "product_social_stat",
    // 默认非模拟模式
    dryRun: false,
  } satisfies DataCleanupConfig,
};
