import 'dotenv/config'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  crawlQueue,
  trendingQueue,
  cleanupQueue,
  createCrawlWorker,
  createTrendingWorker,
  createCleanupWorker,
  addCrawlJob,
  addTrendingJob,
  addCleanupJob,
  closeQueues,
} from './queue'
import { scheduleRecurringJobs, removeScheduledJobs } from './scheduler'
import { processCrawlJob, processTrendingJob, processCleanupJob } from './processors'
import { logger } from './utils/logger'

interface CliArgs {
  mode: 'worker' | 'scheduler' | 'both'
  runOnce: boolean
  source: 'TWITTER' | 'AMAZON' | 'ALL'
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .options({
      mode: {
        type: 'string',
        choices: ['worker', 'scheduler', 'both'] as const,
        default: 'both',
        description: 'Run mode: worker (process jobs), scheduler (schedule jobs), or both',
      },
      'run-once': {
        type: 'boolean',
        default: false,
        description: 'Run a single job and exit',
      },
      source: {
        type: 'string',
        choices: ['TWITTER', 'AMAZON', 'ALL'] as const,
        default: 'ALL',
        description: 'Source to crawl (only for run-once mode)',
      },
    })
    .parseAsync()

  const args: CliArgs = {
    mode: argv.mode as 'worker' | 'scheduler' | 'both',
    runOnce: argv.runOnce,
    source: argv.source as 'TWITTER' | 'AMAZON' | 'ALL',
  }

  logger.info('Good-Trending Scheduler Starting...')
  logger.info('Configuration:', args)

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...')
    await closeQueues()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    if (args.runOnce) {
      // Run a single job and exit
      logger.info(`Running single crawl job for source: ${args.source}`)
      await addCrawlJob(args.source)

      // Wait a moment for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 5000))

      logger.info('Single job completed')
      await closeQueues()
      process.exit(0)
    }

    // Start workers and/or scheduler based on mode
    if (args.mode === 'worker' || args.mode === 'both') {
      logger.info('Starting workers...')

      // Create workers
      createCrawlWorker(processCrawlJob)
      createTrendingWorker(processTrendingJob)
      createCleanupWorker(processCleanupJob)

      logger.info('Workers started')
    }

    if (args.mode === 'scheduler' || args.mode === 'both') {
      logger.info('Starting scheduler...')

      // Schedule recurring jobs
      await scheduleRecurringJobs({
        crawlQueue,
        trendingQueue,
        cleanupQueue,
      })

      logger.info('Scheduler started')
    }

    logger.info('Scheduler is running. Press Ctrl+C to stop.')

    // Keep the process running
    await new Promise(() => {})
  } catch (error) {
    const err = error as Error
    logger.error(`Scheduler failed: ${err.message}`)
    logger.error(err.stack || 'No stack trace')
    await closeQueues()
    process.exit(1)
  }
}

// Run main function
main()
