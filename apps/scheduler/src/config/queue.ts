export const QUEUE_NAMES = {
  CRAWL_TWITTER: 'crawl:twitter',
  CRAWL_AMAZON: 'crawl:amazon',
  CRAWL_ALL: 'crawl:all',
  UPDATE_TRENDING: 'update:trending',
  CLEANUP: 'cleanup:old-data',
} as const

export const CRON_SCHEDULES = {
  CRAWL_TWITTER: '0 */4 * * *', // Every 4 hours
  CRAWL_AMAZON: '0 0 * * *', // Daily at midnight
  UPDATE_TRENDING: '0 * * * *', // Every hour
  CLEANUP: '0 0 3 * *', // Daily at 3 AM
} as const

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
}

export const JOB_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
}
