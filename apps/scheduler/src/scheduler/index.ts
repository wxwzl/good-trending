import { QueueScheduler } from 'bullmq'
import { Redis } from 'ioredis'
import { QUEUE_NAMES, REDIS_CONFIG, CRON_SCHEDULES } from '../config/queue'
import { logger } from '../utils/logger'

// Redis connection for schedulers
const connection = new Redis(REDIS_CONFIG)

/**
 * Create a queue scheduler that handles delayed jobs and cron scheduling
 */
export function createCrawlScheduler(): QueueScheduler {
  const scheduler = new QueueScheduler(QUEUE_NAMES.CRAWL_ALL, {
    connection,
  })

  scheduler.on('error', (error) => {
    logger.error('Crawl scheduler error:', error)
  })

  logger.info('Crawl scheduler started')
  return scheduler
}

export function createTrendingScheduler(): QueueScheduler {
  const scheduler = new QueueScheduler(QUEUE_NAMES.UPDATE_TRENDING, {
    connection,
  })

  scheduler.on('error', (error) => {
    logger.error('Trending scheduler error:', error)
  })

  logger.info('Trending scheduler started')
  return scheduler
}

export function createCleanupScheduler(): QueueScheduler {
  const scheduler = new QueueScheduler(QUEUE_NAMES.CLEANUP, {
    connection,
  })

  scheduler.on('error', (error) => {
    logger.error('Cleanup scheduler error:', error)
  })

  logger.info('Cleanup scheduler started')
  return scheduler
}

/**
 * Schedule recurring jobs using repeatable jobs
 */
export async function scheduleRecurringJobs(
  queues: {
    crawlQueue: import('bullmq').Queue
    trendingQueue: import('bullmq').Queue
    cleanupQueue: import('bullmq').Queue
  }
): Promise<void> {
  const { crawlQueue, trendingQueue, cleanupQueue } = queues

  // Schedule Twitter crawl every 4 hours
  await crawlQueue.add(
    'crawl',
    { source: 'TWITTER', timestamp: new Date().toISOString() },
    {
      repeat: {
        pattern: CRON_SCHEDULES.CRAWL_TWITTER,
      },
      jobId: 'scheduled-twitter-crawl',
    }
  )

  // Schedule Amazon crawl daily
  await crawlQueue.add(
    'crawl',
    { source: 'AMAZON', timestamp: new Date().toISOString() },
    {
      repeat: {
        pattern: CRON_SCHEDULES.CRAWL_AMAZON,
      },
      jobId: 'scheduled-amazon-crawl',
    }
  )

  // Schedule trending update hourly
  await trendingQueue.add(
    'update-trending',
    { period: 'daily', timestamp: new Date().toISOString() },
    {
      repeat: {
        pattern: CRON_SCHEDULES.UPDATE_TRENDING,
      },
      jobId: 'scheduled-trending-update',
    }
  )

  // Schedule cleanup daily at 3 AM
  await cleanupQueue.add(
    'cleanup',
    { daysToKeep: 30, timestamp: new Date().toISOString() },
    {
      repeat: {
        pattern: CRON_SCHEDULES.CLEANUP,
      },
      jobId: 'scheduled-cleanup',
    }
  )

  logger.info('Recurring jobs scheduled')
}

/**
 * Remove all scheduled jobs
 */
export async function removeScheduledJobs(
  queues: {
    crawlQueue: import('bullmq').Queue
    trendingQueue: import('bullmq').Queue
    cleanupQueue: import('bullmq').Queue
  }
): Promise<void> {
  const { crawlQueue, trendingQueue, cleanupQueue } = queues

  const repeatableJobs = await Promise.all([
    crawlQueue.getRepeatableJobs(),
    trendingQueue.getRepeatableJobs(),
    cleanupQueue.getRepeatableJobs(),
  ])

  for (const jobs of repeatableJobs) {
    for (const job of jobs) {
      await crawlQueue.removeRepeatableByKey(job.key)
    }
  }

  logger.info('Removed all scheduled jobs')
}
