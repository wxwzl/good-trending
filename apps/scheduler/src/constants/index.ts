/**
 * 常量定义
 * 集中管理所有配置常量，避免魔法数字
 */

/**
 * 任务保留配置
 */
export const JOB_RETENTION_CONFIG = {
  /** 已完成任务保留 24 小时，最多 100 条 */
  removeOnComplete: {
    age: 24 * 60 * 60,
    count: 100,
  },
  /** 失败任务保留 7 天，最多 500 条 */
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 500,
  },
} as const;

/**
 * 任务超时配置
 */
export const JOB_TIMEOUT_CONFIG = {
  /** 默认任务超时：30 分钟 */
  default: 30 * 60 * 1000,
  /** 爬虫任务超时：60 分钟 */
  crawler: 60 * 60 * 1000,
  /** 趋势任务超时：20 分钟 */
  trending: 20 * 60 * 1000,
} as const;

/**
 * 重试配置
 */
export const JOB_RETRY_CONFIG = {
  /** 默认重试次数 */
  attempts: 3,
  /** 指数退避 */
  backoff: {
    type: "exponential" as const,
    delay: 60 * 1000, // 初始延迟 1 分钟
  },
} as const;

/**
 * 爬虫配置
 */
export const CRAWLER_CONFIG = {
  /** 浏览器超时（毫秒） */
  BROWSER_TIMEOUT: 60000,
  /** 类目热度爬取配置 */
  CATEGORY_HEAT: {
    MAX_RESULTS_PER_CATEGORY: 10,
    SEARCH_DELAY_MIN: 3000,
    SEARCH_DELAY_MAX: 6000,
  },
  /** 商品发现配置 */
  PRODUCT_DISCOVERY: {
    MAX_RESULTS_PER_CATEGORY: 30,
    DEFAULT_MAX_PRODUCTS: 10,
    SEARCH_DELAY_MIN: 5000,
    SEARCH_DELAY_MAX: 10000,
  },
  /** 提及统计配置 */
  MENTIONS: {
    DEFAULT_MAX_PRODUCTS: 50,
    BATCH_SIZE: 10,
    BATCH_DELAY_MS: 5000,
  },
  /** Worker 限流配置 */
  WORKER_LIMITER: {
    MAX: 1,
    DURATION_MS: 60000,
  },
} as const;

/**
 * 趋势榜单配置
 */
export const TRENDING_CONFIG = {
  /** 榜单最大商品数 */
  MAX_RANKS: 2000,
  /** 批量插入大小 */
  BATCH_SIZE: 500,
  /** 分数计算：X 平台权重 */
  X_MENTION_WEIGHT: 0.8,
  /** 时间衰减：最大天数 */
  TIME_DECAY_MAX_DAYS: 60,
  /** 时间衰减：最低因子 */
  TIME_DECAY_MIN_FACTOR: 0.5,
} as const;

/**
 * 周期类型
 */
export const PERIOD_TYPES = [
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_7_DAYS",
  "LAST_15_DAYS",
  "LAST_30_DAYS",
  "LAST_60_DAYS",
] as const;

/**
 * Cron 表达式
 */
export const CRON_SCHEDULES = {
  /** 每2小时执行 */
  EVERY_2_HOURS: "0 */2 * * *",
  /** 每天凌晨2点执行 */
  DAILY_2AM: "0 2 * * *",
  /** 每天凌晨3点执行 */
  DAILY_3AM: "0 3 * * *",
  /** 每天凌晨4点执行 */
  DAILY_4AM: "0 4 * * *",
  /** 每天凌晨5点执行 */
  DAILY_5AM: "0 5 * * *",
  /** 每15分钟执行 */
  EVERY_15_MINUTES: "*/15 * * * *",
} as const;
