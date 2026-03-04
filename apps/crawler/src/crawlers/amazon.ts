import { Page } from 'playwright'
import { BaseCrawler } from './base'
import { CrawledProduct, SourceType } from '../types'
import { logger } from '../utils/logger'
import { slugify } from '@good-trending/shared'

export interface AmazonCrawlerOptions {
  headless?: boolean
  timeout?: number
  maxRetries?: number
  maxProducts?: number
  category?: string
}

export class AmazonCrawler extends BaseCrawler {
  private maxProducts: number
  private category: string

  constructor(options: AmazonCrawlerOptions = {}) {
    super(options)
    this.maxProducts = options.maxProducts ?? 50
    this.category = options.category ?? ''
  }

  getSourceType(): SourceType {
    return 'AMAZON'
  }

  async crawl(): Promise<CrawledProduct[]> {
    const page = await this.createPage()
    const products: CrawledProduct[] = []

    try {
      // Navigate to Amazon Best Sellers
      await this.navigateToBestSellers(page)

      // Extract product links from best sellers
      const productLinks = await this.extractProductLinks(page)
      logger.info(`Found ${productLinks.length} best seller products`)

      // Process each product
      for (const link of productLinks.slice(0, this.maxProducts)) {
        try {
          await this.randomDelay(1000, 2000)

          const product = await this.processProduct(page, link)
          if (product) {
            products.push(product)
            logger.debug(`Processed product: ${product.name}`)
          }
        } catch (error) {
          const err = error as Error
          this.addError(link, err.message)
        }
      }

      return products
    } finally {
      await page.close()
    }
  }

  private async navigateToBestSellers(page: Page): Promise<void> {
    const bestSellersUrl = this.category
      ? `https://www.amazon.com/Best-Sellers/zgbs/${this.category}`
      : 'https://www.amazon.com/Best-Sellers/zgbs'

    logger.info(`Navigating to Amazon Best Sellers: ${bestSellersUrl}`)
    await this.navigateWithRetry(page, bestSellersUrl)

    // Wait for products to load
    await page.waitForSelector('#gridItemRoot, .p13n-grid-row', { timeout: 15000 }).catch(() => {
      logger.warn('Best seller grid not found')
    })
  }

  private async extractProductLinks(page: Page): Promise<string[]> {
    const links: string[] = []

    try {
      // Extract product links from best sellers list
      const productElements = await page.$$(
        '#gridItemRoot a[href*="/dp/"], .p13n-grid-row a[href*="/dp/"]'
      )

      for (const element of productElements) {
        try {
          const href = await element.getAttribute('href')
          if (href) {
            // Extract clean product URL
            const asin = this.extractAsin(href)
            if (asin) {
              links.push(`https://www.amazon.com/dp/${asin}`)
            }
          }
        } catch {
          // Skip invalid elements
        }
      }

      // Remove duplicates
      return [...new Set(links)]
    } catch (error) {
      const err = error as Error
      logger.error(`Failed to extract product links: ${err.message}`)
      return links
    }
  }

  private extractAsin(url: string): string | null {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/i)
    return match ? match[1] : null
  }

  private async processProduct(page: Page, url: string): Promise<CrawledProduct | null> {
    // Navigate to product page
    await this.navigateWithRetry(page, url)

    // Wait for product details to load
    await page.waitForSelector('#productTitle, #centerCol', { timeout: 10000 }).catch(() => {
      logger.warn(`Product details not found for ${url}`)
    })

    // Extract product information
    const productData = await this.extractProductData(page)
    if (!productData.name) {
      return null
    }

    // Extract ASIN from URL
    const asin = this.extractAsin(url)
    if (!asin) {
      return null
    }

    // Create product
    const product: CrawledProduct = {
      name: productData.name,
      description: productData.description || productData.name,
      imageUrl: productData.imageUrl,
      sourceUrl: url,
      sourceType: 'AMAZON',
      sourceId: asin,
      price: productData.price,
      currency: 'USD',
      rating: productData.rating,
      reviewCount: productData.reviewCount,
      topics: productData.categories,
      tags: ['amazon', 'bestseller', ...productData.categories.map((c) => c.toLowerCase())],
    }

    return product
  }

  private async extractProductData(page: Page): Promise<{
    name: string
    description: string
    imageUrl: string
    price: number | null
    rating: number | null
    reviewCount: number
    categories: string[]
  }> {
    return page.evaluate(() => {
      // Extract name
      const nameElement = document.querySelector('#productTitle')
      const name = nameElement?.textContent?.trim() || ''

      // Extract description
      const descElement = document.querySelector('#productDescription p, #featurebullets_feature_div')
      const description = descElement?.textContent?.trim() || ''

      // Extract image
      const imageElement = document.querySelector('#landingImage, #imgBlkFront')
      const imageUrl = imageElement?.getAttribute('src') || ''

      // Extract price
      const priceWhole = document.querySelector('.a-price-whole')?.textContent?.replace(/[^\d.]/g, '')
      const priceFraction = document.querySelector('.a-price-fraction')?.textContent || '00'
      const price = priceWhole ? parseFloat(`${priceWhole}.${priceFraction}`) : null

      // Extract rating
      const ratingText = document.querySelector('.a-icon-star-small, .a-icon-star')?.textContent || ''
      const ratingMatch = ratingText.match(/([\d.]+)/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

      // Extract review count
      const reviewText = document.querySelector('#acrCustomerReviewText')?.textContent || ''
      const reviewMatch = reviewText.match(/([\d,]+)/)
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : 0

      // Extract categories
      const categoryElements = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a')
      const categories = Array.from(categoryElements)
        .map((el) => el.textContent?.trim())
        .filter((c): c is string => !!c && c.length > 0)

      return {
        name,
        description,
        imageUrl,
        price,
        rating,
        reviewCount,
        categories,
      }
    })
  }
}
