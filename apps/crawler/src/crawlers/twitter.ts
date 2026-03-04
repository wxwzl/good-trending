import { Page } from 'playwright'
import { BaseCrawler } from './base'
import { CrawledProduct, SourceType } from '../types'
import { logger } from '../utils/logger'
import { slugify } from '@good-trending/shared'

export interface TwitterCrawlerOptions {
  headless?: boolean
  timeout?: number
  maxRetries?: number
  maxProducts?: number
}

export class TwitterCrawler extends BaseCrawler {
  private maxProducts: number

  constructor(options: TwitterCrawlerOptions = {}) {
    super(options)
    this.maxProducts = options.maxProducts ?? 50
  }

  getSourceType(): SourceType {
    return 'TWITTER'
  }

  async crawl(): Promise<CrawledProduct[]> {
    const page = await this.createPage()
    const products: CrawledProduct[] = []

    try {
      // Navigate to Twitter/X trending page
      // Note: Twitter requires authentication for most content
      // This is a simplified example - real implementation would need auth handling
      await this.navigateToTrending(page)

      // Wait for trending content to load
      await page.waitForSelector('[data-testid="trend"]', { timeout: 10000 }).catch(() => {
        logger.warn('Trending elements not found, trying alternative selectors')
      })

      // Extract trending topics
      const trends = await this.extractTrends(page)
      logger.info(`Found ${trends.length} trending topics`)

      // Process each trend
      for (const trend of trends.slice(0, this.maxProducts)) {
        try {
          await this.randomDelay(500, 1500)

          const product = await this.processTrend(page, trend)
          if (product) {
            products.push(product)
            logger.debug(`Processed trend: ${product.name}`)
          }
        } catch (error) {
          const err = error as Error
          this.addError(trend.url || trend.name, err.message)
        }
      }

      return products
    } finally {
      await page.close()
    }
  }

  private async navigateToTrending(page: Page): Promise<void> {
    // Twitter/X explore/trending page
    const trendingUrl = 'https://twitter.com/explore/tabs/trending'

    logger.info(`Navigating to Twitter trending: ${trendingUrl}`)
    await this.navigateWithRetry(page, trendingUrl)
  }

  private async extractTrends(page: Page): Promise<Array<{ name: string; url: string; tweets: string }>> {
    const trends: Array<{ name: string; url: string; tweets: string }> = []

    try {
      // Extract trending topics - selectors may need adjustment based on Twitter's current DOM
      const trendElements = await page.$$('[data-testid="trend"]')

      for (const element of trendElements) {
        try {
          const name = await element.$eval('span', (el) => el.textContent || '').catch(() => '')
          const url = await element.$eval('a', (el) => el.href || '').catch(() => '')
          const tweets = await element
            .$eval('[dir="ltr"]', (el) => el.textContent || '')
            .catch(() => '')

          if (name) {
            trends.push({ name, url, tweets })
          }
        } catch {
          // Skip elements that don't match expected structure
        }
      }

      // Fallback: try alternative selectors
      if (trends.length === 0) {
        logger.warn('Primary trend selector failed, trying alternatives')

        const alternativeTrends = await page.evaluate(() => {
          const results: Array<{ name: string; url: string; tweets: string }> = []
          const links = document.querySelectorAll('a[href*="/trending"]')

          links.forEach((link) => {
            const text = link.textContent?.trim()
            if (text && text.length > 0) {
              results.push({
                name: text,
                url: link.href,
                tweets: '',
              })
            }
          })

          return results
        })

        trends.push(...alternativeTrends)
      }
    } catch (error) {
      const err = error as Error
      logger.error(`Failed to extract trends: ${err.message}`)
    }

    return trends
  }

  private async processTrend(
    page: Page,
    trend: { name: string; url: string; tweets: string }
  ): Promise<CrawledProduct | null> {
    // Clean up the trend name
    const name = this.cleanTrendName(trend.name)
    if (!name || name.length < 2) {
      return null
    }

    // Generate slug
    const slug = slugify(name)

    // Extract mention count if available
    const mentionCount = this.parseMentionCount(trend.tweets)

    // Create product from trend
    const product: CrawledProduct = {
      name,
      description: `Trending topic on X (Twitter) with ${mentionCount > 0 ? `${mentionCount} mentions` : 'significant activity'}.`,
      imageUrl: '', // Would need to fetch from actual tweet media
      sourceUrl: trend.url || `https://twitter.com/search?q=${encodeURIComponent(name)}`,
      sourceType: 'TWITTER',
      sourceId: slug,
      price: null,
      currency: 'USD',
      rating: null,
      reviewCount: mentionCount,
      topics: [name],
      tags: ['twitter', 'trending', 'social'],
    }

    return product
  }

  private cleanTrendName(name: string): string {
    // Remove common prefixes and clean up the name
    return name
      .replace(/^Trending in\s+/i, '')
      .replace(/^#\d+\s*-\s*/i, '')
      .replace(/^\.\.\.$/, '')
      .trim()
  }

  private parseMentionCount(tweets: string): number {
    if (!tweets) return 0

    // Parse strings like "10K Tweets", "5,234 posts", etc.
    const match = tweets.match(/([\d,]+[KMBkmb]?)/i)
    if (!match) return 0

    const value = match[1].replace(/,/g, '').toUpperCase()

    if (value.endsWith('K')) {
      return parseFloat(value) * 1000
    } else if (value.endsWith('M')) {
      return parseFloat(value) * 1000000
    } else if (value.endsWith('B')) {
      return parseFloat(value) * 1000000000
    }

    return parseInt(value, 10) || 0
  }
}
