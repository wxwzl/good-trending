import { Browser, Page, chromium, BrowserContext } from 'playwright'
import { logger } from '../utils/logger'
import { CrawledProduct, CrawlerResult, CrawlerError, SourceType } from '../types'

export interface BaseCrawlerOptions {
  headless?: boolean
  timeout?: number
  maxRetries?: number
}

export abstract class BaseCrawler {
  protected browser: Browser | null = null
  protected context: BrowserContext | null = null
  protected headless: boolean
  protected timeout: number
  protected maxRetries: number
  protected errors: CrawlerError[] = []

  constructor(options: BaseCrawlerOptions = {}) {
    this.headless = options.headless ?? true
    this.timeout = options.timeout ?? 30000
    this.maxRetries = options.maxRetries ?? 3
  }

  /**
   * Get the source type for this crawler
   */
  abstract getSourceType(): SourceType

  /**
   * Crawl products from the source
   */
  abstract crawl(): Promise<CrawledProduct[]>

  /**
   * Initialize the browser
   */
  async init(): Promise<void> {
    logger.info(`Initializing ${this.getSourceType()} crawler...`)

    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    })

    // Block unnecessary resources
    await this.context.route('**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot}', (route) => {
      route.abort()
    })

    logger.info(`${this.getSourceType()} crawler initialized`)
  }

  /**
   * Create a new page
   */
  protected async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser context not initialized')
    }

    const page = await this.context.newPage()
    page.setDefaultTimeout(this.timeout)

    return page
  }

  /**
   * Navigate to URL with retry
   */
  protected async navigateWithRetry(page: Page, url: string): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Navigating to ${url} (attempt ${attempt}/${this.maxRetries})`)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeout })
        return
      } catch (error) {
        lastError = error as Error
        logger.warn(`Failed to navigate to ${url}: ${lastError.message}`)

        if (attempt < this.maxRetries) {
          await this.delay(1000 * attempt)
        }
      }
    }

    this.errors.push({
      url,
      message: lastError?.message || 'Unknown error',
      stack: lastError?.stack,
    })

    throw lastError
  }

  /**
   * Add error to the error list
   */
  protected addError(url: string, message: string, stack?: string): void {
    this.errors.push({ url, message, stack })
    logger.error(`Error crawling ${url}: ${message}`)
  }

  /**
   * Delay utility
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Random delay to avoid detection
   */
  protected async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    await this.delay(ms)
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
      logger.info(`${this.getSourceType()} crawler closed`)
    }
  }

  /**
   * Get errors from the crawl
   */
  getErrors(): CrawlerError[] {
    return this.errors
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * Execute the crawl and return results
   */
  async execute(): Promise<CrawlerResult> {
    const startTime = Date.now()
    const source = this.getSourceType()

    logger.info(`Starting ${source} crawl...`)

    try {
      await this.init()
      const products = await this.crawl()

      const duration = Date.now() - startTime

      logger.info(`${source} crawl completed: ${products.length} products in ${duration}ms`)

      return {
        source,
        products,
        totalCount: products.length,
        errors: this.errors,
        duration,
        timestamp: new Date(),
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const err = error as Error

      logger.error(`${source} crawl failed: ${err.message}`)

      this.addError('crawl', err.message, err.stack)

      return {
        source,
        products: [],
        totalCount: 0,
        errors: this.errors,
        duration,
        timestamp: new Date(),
      }
    } finally {
      await this.close()
    }
  }
}
