import 'dotenv/config'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { CrawlerManager } from './manager'
import { logger } from './utils/logger'
import type { SourceType } from './types'

interface CliArgs {
  source: SourceType | 'ALL'
  headless: boolean
  timeout: number
  maxRetries: number
  concurrency: number
}

async function main() {
  // Parse command line arguments
  const argv = await yargs(hideBin(process.argv))
    .options({
      source: {
        type: 'string',
        choices: ['TWITTER', 'AMAZON', 'ALL'] as const,
        default: 'ALL',
        description: 'Data source to crawl',
      },
      headless: {
        type: 'boolean',
        default: true,
        description: 'Run browser in headless mode',
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: 'Page load timeout in milliseconds',
      },
      maxRetries: {
        type: 'number',
        default: 3,
        description: 'Maximum retry attempts for failed requests',
      },
      concurrency: {
        type: 'number',
        default: 1,
        description: 'Number of concurrent crawlers',
      },
    })
    .parseAsync()

  const args: CliArgs = {
    source: argv.source as SourceType | 'ALL',
    headless: argv.headless,
    timeout: argv.timeout,
    maxRetries: argv.maxRetries,
    concurrency: argv.concurrency,
  }

  logger.info('Good-Trending Crawler Starting...')
  logger.info('Configuration:', args)

  try {
    const manager = new CrawlerManager(args)
    const results = await manager.run()

    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log('Crawl Summary')
    console.log('='.repeat(50))

    let totalProducts = 0
    let totalErrors = 0

    for (const result of results) {
      console.log(`\n${result.source}:`)
      console.log(`  Products: ${result.totalCount}`)
      console.log(`  Errors: ${result.errors.length}`)
      console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`)

      totalProducts += result.totalCount
      totalErrors += result.errors.length
    }

    console.log('\n' + '-'.repeat(50))
    console.log(`Total Products: ${totalProducts}`)
    console.log(`Total Errors: ${totalErrors}`)
    console.log('='.repeat(50))

    // Exit with error code if there were any errors
    if (totalErrors > 0) {
      process.exit(1)
    }

    process.exit(0)
  } catch (error) {
    const err = error as Error
    logger.error(`Crawler failed: ${err.message}`)
    logger.error(err.stack || 'No stack trace')
    process.exit(1)
  }
}

// Run main function
main()
