import { PrismaClient } from '@prisma/client'
import { TwitterCrawler, AmazonCrawler } from './crawlers'
import { CrawlerConfig, CrawlerResult, CrawledProduct, SourceType } from './types'
import { logger } from './utils/logger'

export class CrawlerManager {
  private prisma: PrismaClient
  private config: CrawlerConfig

  constructor(config: Partial<CrawlerConfig> = {}) {
    this.prisma = new PrismaClient()
    this.config = {
      source: config.source || 'ALL',
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      concurrency: config.concurrency ?? 1,
    }
  }

  /**
   * Run the crawler(s) based on configuration
   */
  async run(): Promise<CrawlerResult[]> {
    const results: CrawlerResult[] = []
    const startTime = Date.now()

    logger.info(`Starting crawler manager with source: ${this.config.source}`)

    try {
      // Determine which sources to crawl
      const sources = this.getSourcesToCrawl()

      // Run crawlers based on concurrency setting
      if (this.config.concurrency > 1) {
        // Parallel execution
        const promises = sources.map((source) => this.runCrawler(source))
        const parallelResults = await Promise.all(promises)
        results.push(...parallelResults)
      } else {
        // Sequential execution
        for (const source of sources) {
          const result = await this.runCrawler(source)
          results.push(result)
        }
      }

      // Save results to database
      await this.saveResults(results)

      const totalDuration = Date.now() - startTime
      logger.info(`Crawler manager completed in ${totalDuration}ms`)

      return results
    } finally {
      await this.prisma.$disconnect()
    }
  }

  /**
   * Get list of sources to crawl based on config
   */
  private getSourcesToCrawl(): SourceType[] {
    if (this.config.source === 'ALL') {
      return ['TWITTER', 'AMAZON']
    }
    return [this.config.source]
  }

  /**
   * Run a specific crawler
   */
  private async runCrawler(source: SourceType): Promise<CrawlerResult> {
    switch (source) {
      case 'TWITTER': {
        const crawler = new TwitterCrawler({
          headless: this.config.headless,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        })
        return crawler.execute()
      }
      case 'AMAZON': {
        const crawler = new AmazonCrawler({
          headless: this.config.headless,
          timeout: this.config.timeout,
          maxRetries: this.config.maxRetries,
        })
        return crawler.execute()
      }
      default:
        throw new Error(`Unknown source type: ${source}`)
    }
  }

  /**
   * Save crawled results to database
   */
  private async saveResults(results: CrawlerResult[]): Promise<void> {
    for (const result of results) {
      logger.info(`Saving ${result.products.length} products from ${result.source}`)

      for (const product of result.products) {
        try {
          // Upsert product
          await this.saveProduct(product)
        } catch (error) {
          const err = error as Error
          logger.error(`Failed to save product ${product.name}: ${err.message}`)
        }
      }

      // Log crawl result
      await this.logCrawl(result)
    }
  }

  /**
   * Save or update a product
   */
  private async saveProduct(product: CrawledProduct): Promise<void> {
    // Create or update product
    const savedProduct = await this.prisma.product.upsert({
      where: {
        sourceType_sourceId: {
          sourceType: product.sourceType,
          sourceId: product.sourceId,
        },
      },
      update: {
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        price: product.price,
        currency: product.currency,
        rating: product.rating,
        reviewCount: product.reviewCount,
        updatedAt: new Date(),
      },
      create: {
        name: product.name,
        slug: this.generateSlug(product),
        description: product.description,
        imageUrl: product.imageUrl,
        sourceUrl: product.sourceUrl,
        sourceType: product.sourceType,
        sourceId: product.sourceId,
        price: product.price,
        currency: product.currency,
        rating: product.rating,
        reviewCount: product.reviewCount,
        viewCount: 0,
        trendingScore: 0,
        isActive: true,
      },
    })

    // Handle topics
    for (const topicName of product.topics) {
      if (topicName) {
        const topic = await this.prisma.topic.upsert({
          where: { slug: this.slugify(topicName) },
          update: { name: topicName },
          create: {
            name: topicName,
            slug: this.slugify(topicName),
          },
        })

        // Link product to topic
        await this.prisma.productTopic.upsert({
          where: {
            productId_topicId: {
              productId: savedProduct.id,
              topicId: topic.id,
            },
          },
          update: {},
          create: {
            productId: savedProduct.id,
            topicId: topic.id,
          },
        })
      }
    }

    // Handle tags
    for (const tagName of product.tags) {
      if (tagName) {
        const tag = await this.prisma.tag.upsert({
          where: { slug: this.slugify(tagName) },
          update: { name: tagName },
          create: {
            name: tagName,
            slug: this.slugify(tagName),
          },
        })

        // Link product to tag
        await this.prisma.productTag.upsert({
          where: {
            productId_tagId: {
              productId: savedProduct.id,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            productId: savedProduct.id,
            tagId: tag.id,
          },
        })
      }
    }
  }

  /**
   * Log the crawl result
   */
  private async logCrawl(result: CrawlerResult): Promise<void> {
    await this.prisma.crawlerLog.create({
      data: {
        source: result.source,
        status: result.errors.length > 0 ? 'FAILED' : 'COMPLETED',
        productsCount: result.totalCount,
        errors: result.errors,
        duration: result.duration,
        startedAt: result.timestamp,
        completedAt: new Date(),
      },
    })
  }

  /**
   * Generate a unique slug for a product
   */
  private generateSlug(product: CrawledProduct): string {
    const baseSlug = this.slugify(product.name)
    const uniqueSuffix = `${product.sourceType.toLowerCase()}-${product.sourceId.slice(0, 8)}`
    return `${baseSlug}-${uniqueSuffix}`
  }

  /**
   * Convert string to slug format
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}
