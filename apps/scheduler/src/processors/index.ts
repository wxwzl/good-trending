import { Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger'
import { CrawlJobData, TrendingJobData, CleanupJobData } from '../queue'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

/**
 * Process crawl jobs
 */
export async function processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
  const { source } = job.data

  logger.info(`Processing crawl job for source: ${source}`)

  try {
    // Update job progress
    await job.updateProgress(10)

    // Execute the crawler
    const command = `pnpm --filter @good-trending/crawler crawl:${source.toLowerCase()}`
    logger.info(`Executing: ${command}`)

    await job.updateProgress(30)

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 10 * 60 * 1000, // 10 minutes timeout
    })

    await job.updateProgress(90)

    if (stderr && !stderr.includes('warning')) {
      logger.warn(`Crawler stderr: ${stderr}`)
    }

    logger.info(`Crawler output: ${stdout}`)

    // Update trending scores after crawl
    await updateTrendingScores()

    await job.updateProgress(100)

    logger.info(`Crawl job completed for source: ${source}`)
  } catch (error) {
    const err = error as Error
    logger.error(`Crawl job failed: ${err.message}`)
    throw error
  }
}

/**
 * Process trending update jobs
 */
export async function processTrendingJob(job: Job<TrendingJobData>): Promise<void> {
  const { period } = job.data

  logger.info(`Processing trending update for period: ${period}`)

  try {
    await job.updateProgress(10)

    // Update trending scores
    await updateTrendingScores()

    await job.updateProgress(50)

    // Calculate and store trend data
    await calculateAndStoreTrends(period)

    await job.updateProgress(100)

    logger.info(`Trending update completed for period: ${period}`)
  } catch (error) {
    const err = error as Error
    logger.error(`Trending job failed: ${err.message}`)
    throw error
  }
}

/**
 * Process cleanup jobs
 */
export async function processCleanupJob(job: Job<CleanupJobData>): Promise<void> {
  const { daysToKeep } = job.data

  logger.info(`Processing cleanup, keeping last ${daysToKeep} days`)

  try {
    await job.updateProgress(10)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    // Delete old crawler logs
    const deletedLogs = await prisma.crawlerLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    await job.updateProgress(50)

    logger.info(`Deleted ${deletedLogs.count} old crawler logs`)

    // Delete old product history
    const deletedHistory = await prisma.productHistory.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    await job.updateProgress(80)

    logger.info(`Deleted ${deletedHistory.count} old product history records`)

    await job.updateProgress(100)

    logger.info('Cleanup completed')
  } catch (error) {
    const err = error as Error
    logger.error(`Cleanup job failed: ${err.message}`)
    throw error
  }
}

/**
 * Update trending scores for all products
 */
async function updateTrendingScores(): Promise<void> {
  logger.info('Updating trending scores...')

  // Get all active products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      topics: true,
    },
  })

  for (const product of products) {
    // Calculate trending score based on various factors
    const viewScore = Math.min(product.viewCount / 1000, 50)
    const reviewScore = Math.min(product.reviewCount / 100, 30)
    const ratingScore = product.rating ? (product.rating / 5) * 20 : 0

    const trendingScore = Math.round(viewScore + reviewScore + ratingScore)

    // Update product
    await prisma.product.update({
      where: { id: product.id },
      data: { trendingScore },
    })
  }

  logger.info(`Updated trending scores for ${products.length} products`)
}

/**
 * Calculate and store trend data
 */
async function calculateAndStoreTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<void> {
  logger.info(`Calculating trends for period: ${period}`)

  // Determine date range based on period
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'daily':
      startDate = new Date(now.setDate(now.getDate() - 1))
      break
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - 7))
      break
    case 'monthly':
      startDate = new Date(now.setMonth(now.getMonth() - 1))
      break
  }

  // Get top products by trending score
  const topProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      trendingScore: { gt: 0 },
    },
    orderBy: {
      trendingScore: 'desc',
    },
    take: 100,
  })

  // Create trend records
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < topProducts.length; i++) {
    const product = topProducts[i]

    await prisma.trend.upsert({
      where: {
        productId_date: {
          productId: product.id,
          date: today,
        },
      },
      update: {
        rank: i + 1,
        mentions: product.reviewCount,
        sentiment: 0.5, // Placeholder for sentiment analysis
        score: product.trendingScore,
      },
      create: {
        productId: product.id,
        date: today,
        rank: i + 1,
        mentions: product.reviewCount,
        sentiment: 0.5,
        score: product.trendingScore,
      },
    })
  }

  logger.info(`Created/updated ${topProducts.length} trend records`)
}
