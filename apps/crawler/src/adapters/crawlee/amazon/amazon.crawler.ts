/**
 * Amazon Crawlee 实现
 * 基于 BaseCrawleeCrawler 实现亚马逊商品爬取
 */

import { BaseCrawleeCrawler, type CrawleeRequestContext } from "../base/index.js";
import type { IAmazonSearch } from "../../../domain/interfaces/index.js";
import type { AmazonProduct } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("amazon-crawler");

/**
 * Amazon Crawler 配置
 */
export interface AmazonCrawlerConfig {
  /** 亚马逊域名 */
  domain: string;
  /** 搜索间隔 (毫秒) */
  delay: number;
  /** 是否无头模式 */
  headless: boolean;
  /** 浏览器超时 (毫秒) */
  timeout: number;
}

/**
 * Amazon Crawlee 实现
 * 继承 BaseCrawleeCrawler，实现 IAmazonSearch 接口
 */
export class AmazonCrawler extends BaseCrawleeCrawler implements IAmazonSearch {
  private domain: string;
  private delay: number;
  private searchResults: AmazonProduct[] = [];
  private productDetails: AmazonProduct | null = null;

  constructor(config: Partial<AmazonCrawlerConfig> = {}) {
    super({
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      maxConcurrency: 1, // Amazon 需要低并发避免被封
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 10,
    });

    this.domain = config.domain ?? process.env.AMAZON_DOMAIN ?? "amazon.com";
    this.delay = config.delay ?? parseInt(process.env.AMAZON_SEARCH_DELAY ?? "5000", 10);
  }

  /**
   * 请求处理器
   * 根据请求标签处理不同类型的爬取任务
   */
  protected async handleRequest(context: CrawleeRequestContext): Promise<void> {
    const { request } = context;
    const label = request.label ?? "";

    logger.info(`处理 Amazon 请求: ${request.url}, 标签: ${label}`);

    try {
      if (label === "search") {
        await this.handleSearchRequest(context);
      } else if (label === "product-detail") {
        await this.handleProductDetailRequest(context);
      } else {
        logger.warn(`未知的请求标签: ${label}`);
      }

      // 请求间隔（反检测）
      if (this.delay > 0) {
        await this.randomDelay(this.delay, this.delay + 2000);
      }
    } catch (error) {
      logger.error(`处理请求失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 处理搜索请求
   */
  private async handleSearchRequest(context: CrawleeRequestContext): Promise<void> {
    const { page } = context;

    logger.info("等待搜索结果加载...");
    await this.waitForSelector(page, '[data-component-type="s-search-result"]', 10000);

    // 随机延迟（反检测）
    await this.randomDelay(2000, 4000);

    // 提取商品信息
    const products = await page.evaluate((maxResults) => {
      const items = document.querySelectorAll('[data-component-type="s-search-result"]');
      const results: Array<{
        asin: string;
        name: string;
        price?: number;
        currency: string;
        image?: string;
        rating?: number;
        reviewCount?: number;
      }> = [];

      for (let i = 0; i < Math.min(items.length, maxResults); i++) {
        const item = items[i];

        // 提取 ASIN
        const asin = item.getAttribute("data-asin")?.trim() ?? "";
        if (!asin) {
          continue;
        }

        // 提取商品名称
        const titleEl = item.querySelector("h2 a span, .s-size-mini span");
        const name = titleEl?.textContent?.trim() ?? "";

        // 提取价格
        const priceEl = item.querySelector(".a-price .a-offscreen");
        let price: number | undefined;
        let currency = "USD";

        if (priceEl) {
          const priceText = priceEl.textContent ?? "";
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(/,/g, ""));
            if (priceText.includes("¥") || priceText.includes("CNY")) {
              currency = "CNY";
            } else if (priceText.includes("€") || priceText.includes("EUR")) {
              currency = "EUR";
            } else if (priceText.includes("£") || priceText.includes("GBP")) {
              currency = "GBP";
            }
          }
        }

        // 提取图片
        const imageEl = item.querySelector("img.s-image");
        const image = imageEl?.getAttribute("src") ?? undefined;

        // 提取评分
        const ratingEl = item.querySelector(".a-icon-star-small .a-icon-alt");
        let rating: number | undefined;
        if (ratingEl) {
          const ratingText = ratingEl.textContent ?? "";
          const ratingMatch = ratingText.match(/([\d.]+)/);
          if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
          }
        }

        // 提取评价数量
        const reviewEl = item.querySelector('a[href*="#customerReviews"] span');
        let reviewCount: number | undefined;
        if (reviewEl) {
          const reviewText = reviewEl.textContent ?? "";
          const reviewMatch = reviewText.replace(/,/g, "").match(/(\d+)/);
          if (reviewMatch) {
            reviewCount = parseInt(reviewMatch[1], 10);
          }
        }

        results.push({
          asin,
          name,
          price,
          currency,
          image,
          rating,
          reviewCount,
        });
      }

      return results;
    }, 10);

    // 构建完整 URL
    const productsWithUrl = products.map((p) => ({
      ...p,
      url: `https://www.${this.domain}/dp/${p.asin}`,
    }));

    this.searchResults = productsWithUrl;
    logger.info(`提取到 ${productsWithUrl.length} 个商品`);
  }

  /**
   * 处理商品详情请求
   */
  private async handleProductDetailRequest(context: CrawleeRequestContext): Promise<void> {
    const { request, page } = context;

    logger.info("等待商品详情页加载...");
    await this.waitForSelector(page, "#productTitle", 10000);

    // 随机延迟（反检测）
    await this.randomDelay(1500, 3000);

    // 提取 ASIN
    const asinMatch = request.url.match(/\/dp\/(\w{10})/i);
    const asin = asinMatch?.[1] ?? "";

    if (!asin) {
      logger.warn(`无法从 URL 提取 ASIN: ${request.url}`);
      this.productDetails = null;
      return;
    }

    // 提取商品详情
    const product = await page.evaluate(() => {
      // 商品名称
      const name =
        document.querySelector("#productTitle")?.textContent?.trim() ?? "Unknown Product";

      // 价格
      let price: number | undefined;
      let currency = "USD";

      const priceEl = document.querySelector(".a-price .a-offscreen");
      if (priceEl) {
        const priceText = priceEl.textContent ?? "";
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ""));
          if (priceText.includes("¥") || priceText.includes("CNY")) {
            currency = "CNY";
          } else if (priceText.includes("€") || priceText.includes("EUR")) {
            currency = "EUR";
          } else if (priceText.includes("£") || priceText.includes("GBP")) {
            currency = "GBP";
          }
        }
      }

      // 图片
      const image = document.querySelector("#landingImage")?.getAttribute("src") ?? undefined;

      return { name, price, currency, image };
    });

    this.productDetails = {
      ...product,
      asin,
      url: request.url,
    };

    logger.info(`提取商品详情: ${product.name.substring(0, 50)}...`);
  }

  /**
   * 根据关键词搜索商品
   * @param keyword - 搜索关键词
   * @returns 商品列表
   */
  async searchByKeyword(keyword: string): Promise<AmazonProduct[]> {
    this.searchResults = [];

    const searchUrl = `https://www.${this.domain}/s?k=${encodeURIComponent(keyword)}`;
    logger.info(`搜索 Amazon 商品: ${keyword}`);

    await this.runCrawler([{ url: searchUrl, label: "search" }]);

    return this.searchResults;
  }

  /**
   * 从商品详情页 URL 提取商品信息
   * @param url - 商品详情页 URL
   * @returns 商品信息
   */
  async extractProductInfoFromUrl(url: string): Promise<AmazonProduct | null> {
    this.productDetails = null;

    logger.info(`提取商品详情: ${url}`);

    await this.runCrawler([{ url, label: "product-detail" }]);

    return this.productDetails;
  }

  /**
   * 关闭爬虫
   */
  async close(): Promise<void> {
    await super.close();
    logger.info("Amazon 爬虫已关闭");
  }
}

/**
 * 创建 Amazon Crawler 实例
 * @param config - 配置选项
 * @returns AmazonCrawler 实例
 */
export function createAmazonCrawler(config?: Partial<AmazonCrawlerConfig>): AmazonCrawler {
  return new AmazonCrawler(config);
}
