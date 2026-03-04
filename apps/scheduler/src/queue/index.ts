import { Queue, Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { QUEUE_NAMES, REDIS_CONFIG, JOB_CONFIG } from '../config/queue'
import { logger } from '../utils/logger'

// Redis connection
const connection = new Redis(REDIS_CONFIG)

connection.on('connect', () => {
  logger.info('Connected to Redis')
})

connection.on('error', (error) => {
  logger.error('Redis connection error:', error)
})

// Queue instances
export const crawlQueue = new Queue(QUEUE_NAMES.CRAWL_ALL, {
  connection,
  defaultJobOptions: JOB_CONFIG.defaultJobOptions,
})

export const trendingQueue = new Queue(QUEUE_NAMES.UPDATE_TRENDING, {
  connection,
  defaultJobOptions: JOB_CONFIG.defaultJobOptions,
})

export const cleanupQueue = new Queue(QUEUE_NAMES.CLEANUP, {
  connection,
  defaultJobOptions: JOB_CONFIG.defaultJobOptions,
})

// Job data types
export interface CrawlJobData {
  source: 'TWITTER' | 'AMAZON' | 'ALL'
  timestamp: string
}

export interface TrendingJobData {
  period: 'daily' | 'weekly' | 'monthly'
  timestamp: string
}

export interface CleanupJobData {
  daysToKeep: number
  timestamp: string
}

/**
 * Add a crawl job to the queue
 */
export async function addCrawlJob(source: 'TWITTER' | 'AMAZON' | 'ALL'): Promise<Job> {
  const jobData: CrawlJobData = {
    source,
    timestamp: new Date().toISOString(),
  }

  const job = await crawlQueue.add('crawl', jobData, {
    jobId: `crawl-${source.toLowerCase()}-${Date.now()}`,
  })

  logger.info(`Added crawl job: ${job.id}`)
  return job
}

/**
 * Add a trending update job
 */
export async function addTrendingJob(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<Job> {
  const jobData: TrendingJobData = {
    period,
    timestamp: new Date().toISOString(),
  }

  const job = await trendingQueue.add('update-trending', jobData, {
    jobId: `trending-${period}-${Date.now()}`,
  })

  logger.info(`Added trending job: ${job.id}`)
  return job
}

/**
 * Add a cleanup job
 */
export async function addCleanupJob(daysToKeep: number = 30): Promise<Job> {
  const jobData: CleanupJobData = {
    daysToKeep,
    timestamp: new Date().toISOString(),
  }

  const job = await cleanupQueue.add('cleanup', jobData, {
    jobId: `cleanup-${Date.now()}`,
  })

  logger.info(`Added cleanup job: ${job.id}`)
  return job
}

/**
 * Create crawl worker
 */
export function createCrawlWorker(processor: (job: Job<CrawlJobData>) => Promise<void>): Worker {
  const worker = new Worker<CrawlJobData>(QUEUE_NAMES.CRAWL_ALL, processor, {
    connection,
    concurrency: 1,
  })

  worker.on('completed', (job) => {
    logger.info(`Crawl job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Crawl job failed: ${job?.id}`, err)
  })

  return worker
}

/**
 * Create trending worker
 */
export function createTrendingWorker(processor: (job: Job<TrendingJobData>) => Promise<void>): Worker {
  const worker = new Worker<TrendingJobData>(QUEUE_NAMES.UPDATE_TRENDING, processor, {
    connection,
    concurrency: 1,
  })

  worker.on('completed', (job) => {
    logger.info(`Trending job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Trending job failed: ${job?.id}`, err)
  })

  return worker
}

/**
 * Create cleanup worker
 */
export function createCleanupWorker(processor: (job: Job<CleanupJobData>) => Promise<void>): Worker {
  const worker = new Worker<CleanupJobData>(QUEUE_NAMES.CLEANUP, processor, {
    connection,
    concurrency: 1,
  })

  worker.on('completed', (job) => {
    logger.info(`Cleanup job completed: ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Cleanup job failed: ${job?.id}`, err)
  })

  return worker
}

/**
 * Close all queues and connections
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([crawlQueue.close(), trendingQueue.close(), cleanupQueue.close()])
  await connection.quit()
  logger.info('Queues closed')
}
