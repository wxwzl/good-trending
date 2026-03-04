// API 相关常量
export const API_VERSION = 'v1'
export const API_PREFIX = '/api'

// 分页默认值
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 100

// 缓存相关常量
export const CACHE_TTL = {
  SHORT: 60, // 1 分钟
  MEDIUM: 300, // 5 分钟
  LONG: 3600, // 1 小时
  DAY: 86400, // 1 天
}

// 缓存键前缀
export const CACHE_KEYS = {
  PRODUCT: 'product',
  TRENDING: 'trending',
  TOPICS: 'topics',
  SEARCH: 'search',
}

// 队列名称
export const QUEUE_NAMES = {
  X_CRAWLER: 'x-crawler',
  AMAZON_CRAWLER: 'amazon-crawler',
  DATA_PROCESS: 'data-process',
  NOTIFICATION: 'notification',
}

// 调度时间 (Cron 表达式)
export const CRON_SCHEDULES = {
  X_CRAWLER: '0 2 * * *', // 每天凌晨 2:00
  AMAZON_CRAWLER: '0 3 * * *', // 每天凌晨 3:00
  TREND_CALCULATION: '0 5 * * *', // 每天凌晨 5:00
}

// 支持的语言
export const SUPPORTED_LOCALES = ['en', 'zh'] as const
export const DEFAULT_LOCALE = 'en'

// 主题
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const
