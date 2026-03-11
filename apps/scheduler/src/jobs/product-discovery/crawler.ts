/**
 * 商品发现任务 - 爬虫实现
 * 从 Reddit 搜索结果中发现亚马逊商品
 */

import type { Page, Browser } from "playwright";
import { chromium } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import { GoogleSearchService, createAmazonSearchService } from "@good-trending/crawler";
import type {
  ProductDiscoveryConfig,
  CategoryData,
  DiscoveredProduct,
  ProductDiscoveryResult,
} from "./types.js";

const logger = createLoggerInstance("product-discovery-crawler");

/**
 * 商品发现爬虫
 * 搜索 Reddit 并从结果中提取亚马逊商品
 */
export class ProductDiscoveryCrawler {
  private config: Required<ProductDiscoveryConfig>;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private googleSearch: GoogleSearchService;
  private amazonService: ReturnType<typeof createAmazonSearchService>;

  constructor(config: Partial<ProductDiscoveryConfig> = {}) {
    this.config = {
      headless: true,
      maxResultsPerCategory: 30,
      maxProductsPerCategory: 10,
      searchDelayRange: [5000, 10000],
      saveToDb: true,
      ...config,
    };
    this.googleSearch = new GoogleSearchService({
      forceBrowser: true,
    });
    this.amazonService = createAmazonSearchService();
  }

  /**
   * 获取随机延迟时间
   */
  private getRandomDelay(): number {
    const [min, max] = this.config.searchDelayRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 延迟
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 初始化浏览器
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    logger.info("初始化浏览器...");

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    this.page = await this.browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    logger.info("浏览器初始化完成");
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    await this.googleSearch.close();
    await this.amazonService.closeBrowser();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    logger.info("爬虫资源已释放");
  }

  /**
   * 执行商品发现爬取
   */
  async crawl(categories: CategoryData[]): Promise<ProductDiscoveryResult> {
    const startTime = Date.now();
    const results: DiscoveredProduct[] = [];
    const errors: string[] = [];
    const seenAsins = new Set<string>();

    logger.info(`开始从 ${categories.length} 个类目搜索商品`);

    // 初始化浏览器
    await this.initBrowser();

    const today = new Date();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const products = await this.discoverProductsByCategory(category, today);

        for (const product of products) {
          // 去重
          if (!seenAsins.has(product.amazonId)) {
            seenAsins.add(product.amazonId);
            results.push(product);
          }
        }

        logger.info(`类目 "${category.name}" 发现 ${products.length} 个新商品`);
      } catch (error) {
        const errorMsg = `搜索类目 "${category.name}" 商品失败: ${error}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;

    logger.info(`商品发现完成: ${results.length} 个商品, ${errors.length} 个错误`);

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      duration,
    };
  }

  /**
   * 从单个类目发现商品
   */
  private async discoverProductsByCategory(
    category: CategoryData,
    date: Date
  ): Promise<DiscoveredProduct[]> {
    const keyword = category.searchKeywords || category.name;

    // 搜索当天内容
    const today = this.formatDate(date);

    logger.info(`搜索类目 "${keyword}" 当天的Reddit帖子 (after:${today})`);

    const products: DiscoveredProduct[] = [];

    try {
      // 搜索 Reddit（当天）
      const redditQuery = `site:reddit.com "${keyword}" after:${today}`;
      logger.info(`搜索查询: ${redditQuery}`);

      const redditResult = await this.googleSearch.search(redditQuery, this.page || undefined);
      logger.info(`找到 ${redditResult.links.length} 个搜索结果`);

      if (!redditResult.success) {
        logger.warn(`搜索失败: ${redditResult.error}`);
        return products;
      }

      // 从搜索结果中提取亚马逊商品
      const maxResults = this.config.maxResultsPerCategory;
      const amazonProducts = await this.extractAmazonProductsFromLinks(
        redditResult.links.slice(0, maxResults)
      );

      for (const product of amazonProducts) {
        products.push({
          ...product,
          discoveredFromCategory: category.id,
          firstSeenAt: date,
        });
      }

      return products;
    } catch (error) {
      logger.error(`搜索提取商品失败: ${error}`);
      return products;
    }
  }

  /**
   * 从链接列表中提取亚马逊商品
   */
  private async extractAmazonProductsFromLinks(
    links: Array<{ url: string; title: string }>
  ): Promise<Array<Omit<DiscoveredProduct, "discoveredFromCategory" | "firstSeenAt">>> {
    const products: Array<Omit<DiscoveredProduct, "discoveredFromCategory" | "firstSeenAt">> = [];
    const seenAsins = new Set<string>();

    for (const link of links) {
      try {
        // 检查是否是亚马逊链接
        const asin = this.extractAsinFromUrl(link.url);
        if (!asin || seenAsins.has(asin)) {
          continue;
        }

        seenAsins.add(asin);

        // 使用 AmazonSearchService 获取商品详情
        const productInfo = await this.amazonService.extractProductInfo(link.url);
        if (!productInfo) {
          continue;
        }

        products.push({
          amazonId: asin,
          name: productInfo.name || link.title,
          description: productInfo.description,
          image: productInfo.image,
          price: productInfo.price,
          currency: productInfo.currency,
          url: link.url,
        });

        // 限制每个类目的商品数
        if (products.length >= this.config.maxProductsPerCategory) {
          break;
        }
      } catch (error) {
        logger.debug(`提取商品失败 ${link.url}: ${error}`);
      }
    }

    return products;
  }

  /**
   * 从URL中提取ASIN
   */
  private extractAsinFromUrl(url: string): string | null {
    // 亚马逊商品URL格式:
    // https://www.amazon.com/dp/ASIN
    // https://www.amazon.com/gp/product/ASIN
    // https://www.amazon.com/product-name/dp/ASIN
    const patterns = [/\/dp\/(\w{10})/i, /\/gp\/product\/(\w{10})/i, /\/product\/(\w{10})/i];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}
