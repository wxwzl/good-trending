/**
 * AI 商品发现任务 - 调度配置
 */

/**
 * 任务名称
 */
export const AI_PRODUCT_DISCOVERY_JOB_NAME = "ai-product-discovery";

/**
 * Cron 表达式
 * 每2小时执行一次
 */
export const AI_PRODUCT_DISCOVERY_CRON = "0 */2 * * *";

/**
 * 任务配置
 * 根据 ENABLE_AI_ANALYSIS 环境变量决定是否启用
 */
export const AI_PRODUCT_DISCOVERY_CONFIG = {
  /** 任务名称 */
  name: AI_PRODUCT_DISCOVERY_JOB_NAME,
  /** Cron 表达式 */
  cron: AI_PRODUCT_DISCOVERY_CRON,
  /** 是否启用（仅在启用 AI 分析时启用） */
  enabled: process.env.ENABLE_AI_ANALYSIS === "true",
  /** 默认配置 */
  defaults: {
    headless: true,
    maxCategories: 10,
    productsPerKeyword: 6,
    saveToDb: true,
  },
} as const;
