/**
 * 昨天数据统计任务 - 爬虫实现
 * 合并类目热度和商品发现，一次遍历同时处理
 */

import type { Page, Browser } from "playwright";
import { chromium } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import { GoogleSearchService, createAmazonSearchService } from "@good-trending/crawler";
import type {
  YesterdayStatsConfig,
  CategoryData,
  CategoryHeatResult,
  DiscoveredProduct,
  YesterdayStatsResult,
} from "./types.js";

const logger = createLoggerInstance("yesterday-stats-crawler");

/**
 * 昨天数据统计爬虫
 * 一次遍历同时获取热度数据和商品数据
 */
export class YesterdayStatsCrawler {
  private config: Required<YesterdayStatsConfig>;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private googleSearch: GoogleSearchService;
  private amazonService: ReturnType<typeof createAmazonSearchService>;

  constructor(config: Partial<YesterdayStatsConfig> = {}) {
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
   * 执行昨天数据统计爬取
   */
  async crawl(categories: CategoryData[]): Promise<YesterdayStatsResult> {
    const startTime = Date.now();
    const heatResults: CategoryHeatResult[] = [];
    const products: DiscoveredProduct[] = [];
    const errors: string[] = [];
    const seenAsins = new Set<string>();

    logger.info(`开始合并爬取 ${categories.length} 个类目的热度数据和商品`);

    // 初始化浏览器
    await this.initBrowser();

    const today = new Date();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const result = await this.processCategory(category, today);

        if (result.heatResult) {
          heatResults.push(result.heatResult);
        }

        // 添加商品（去重）
        for (const product of result.products) {
          if (!seenAsins.has(product.amazonId)) {
            seenAsins.add(product.amazonId);
            products.push(product);
          }
        }
      } catch (error) {
        const errorMsg = `处理类目 "${category.name}" 失败: ${error}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      `昨天数据统计完成: ${heatResults.length} 个类目热度, ${products.length} 个商品, ${errors.length} 个错误`
    );

    return {
      success: errors.length === 0,
      heatResults,
      products,
      errors,
      duration,
    };
  }

  /**
   * 处理单个类目（热度 + 商品）
   */
  private async processCategory(
    category: CategoryData,
    date: Date
  ): Promise<{ heatResult: CategoryHeatResult | null; products: DiscoveredProduct[] }> {
    const keyword = category.searchKeywords || category.name;
    const dateStr = this.formatDate(date);

    logger.info(`处理类目 "${category.name}": 搜索 + 提取商品`);

    // 搜索 Reddit
    const redditQuery = `site:reddit.com "${keyword}" after:${dateStr}`;
    const redditResult = await this.googleSearch.search(redditQuery, this.page || undefined);

    await this.delay(1000);

    // 搜索 X
    const xQuery = `site:x.com "${keyword}" after:${dateStr}`;
    const xResult = await this.googleSearch.search(xQuery, this.page || undefined);

    // 记录类目热度
    const heatResult: CategoryHeatResult = {
      categoryId: category.id,
      categoryName: category.name,
      statDate: date,
      redditResultCount: redditResult.success ? redditResult.totalResults : 0,
      xResultCount: xResult.success ? xResult.totalResults : 0,
    };

    logger.info(
      `类目 "${category.name}" 热度: Reddit=${heatResult.redditResultCount}, X=${heatResult.xResultCount}`
    );

    // 从 Reddit 结果中提取商品
    const products: DiscoveredProduct[] = [];
    if (redditResult.success) {
      const maxResults = this.config.maxResultsPerCategory;
      const extractedProducts = await this.extractAmazonProductsFromLinks(
        redditResult.links.slice(0, maxResults)
      );

      for (const product of extractedProducts) {
        products.push({
          ...product,
          discoveredFromCategory: category.id,
          firstSeenAt: date,
        });
      }

      logger.info(`类目 "${category.name}" 提取 ${extractedProducts.length} 个新商品`);
    }

    return { heatResult, products };
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
