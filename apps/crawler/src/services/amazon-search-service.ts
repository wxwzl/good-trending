/**
 * Amazon 搜索服务
 * 根据关键词在亚马逊搜索商品
 * 用于 AI 分析后的商品发现
 */

import { AmazonProduct } from "@/domain/types/crawler.types";
import { createLoggerInstance } from "@good-trending/shared";
import type { Browser, Page, ElementHandle } from "playwright";
import { chromium } from "playwright";

const logger = createLoggerInstance("amazon-search-service");

/**
 * 亚马逊搜索配置
 */
export interface AmazonSearchConfig {
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
 * 默认配置
 */
const DEFAULT_CONFIG: AmazonSearchConfig = {
  domain: process.env.AMAZON_DOMAIN || "amazon.com",
  delay: parseInt(process.env.AMAZON_SEARCH_DELAY || "5000", 10),
  headless: true,
  timeout: 30000,
};

/**
 * Amazon 搜索服务
 * 提供基于关键词的商品搜索能力
 */
export class AmazonSearchService {
  private config: AmazonSearchConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(config: Partial<AmazonSearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
    });

    this.page = await this.browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    // 设置超时
    this.page.setDefaultTimeout(this.config.timeout);

    logger.info("浏览器初始化完成");
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info("浏览器已关闭");
    }
  }

  /**
   * 根据关键词搜索商品
   * @param keyword - 搜索关键词
   * @param limit - 返回商品数量上限（默认6个）
   * @returns 商品列表
   */
  async searchByKeyword(keyword: string, limit: number = 6): Promise<AmazonProduct[]> {
    logger.info(`开始搜索亚马逊商品: "${keyword}"，限制 ${limit} 个`);

    await this.initBrowser();

    if (!this.page) {
      throw new Error("浏览器页面未初始化");
    }

    const products: AmazonProduct[] = [];

    try {
      // 构建搜索URL
      const searchUrl = `https://www.${this.config.domain}/s?k=${encodeURIComponent(keyword)}`;
      logger.info(`访问搜索页面: ${searchUrl}`);

      // 访问搜索页面
      await this.page.goto(searchUrl, { waitUntil: "networkidle" });

      // 等待搜索结果加载
      await this.page.waitForSelector('[data-component-type="s-search-result"]', {
        timeout: 10000,
      });

      // 提取商品信息
      const items = await this.page
        .locator('[data-component-type="s-search-result"]')
        .elementHandles();

      logger.info(`找到 ${items.length} 个搜索结果`);

      for (let i = 0; i < Math.min(items.length, limit); i++) {
        try {
          const item = items[i];
          const product = await this.extractProductInfo(item);

          if (product && product.asin) {
            products.push(product);
            logger.info(
              `  ✅ 提取商品: ${product.name.substring(0, 50)}... (ASIN: ${product.asin})`
            );
          }
        } catch (error) {
          logger.warn(`  ⚠️ 提取第 ${i + 1} 个商品失败: ${error}`);
        }
      }

      // 搜索间隔
      if (this.config.delay > 0) {
        logger.info(`等待 ${this.config.delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.config.delay));
      }
    } catch (error) {
      logger.error(`搜索商品失败: ${error}`);
      throw error;
    }

    logger.info(`搜索完成，共提取 ${products.length} 个商品`);
    return products;
  }

  /**
   * 从搜索结果项中提取商品信息
   */
  async extractProductInfo(item: ElementHandle | null): Promise<AmazonProduct | null> {
    if (!this.page || !item) {
      return null;
    }

    try {
      const element = item;

      // 提取 ASIN
      const asinAttr = await element.getAttribute("data-asin");
      const asin = asinAttr?.trim() || "";

      if (!asin) {
        return null;
      }

      // 提取商品名称
      const titleElement = await element.$("h2 a span, .s-size-mini span");
      const name = titleElement ? (await titleElement.textContent()) || "" : "";

      // 提取价格
      const priceElement = await element.$(".a-price .a-offscreen");
      let price: number | undefined;
      let currency = "USD";

      if (priceElement) {
        const priceText = (await priceElement.textContent()) || "";
        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ""));
          // 检测货币符号
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
      const imageElement = await element.$("img.s-image");
      const image = imageElement
        ? (await imageElement.getAttribute("src")) || undefined
        : undefined;

      // 提取评分
      const ratingElement = await element.$(".a-icon-star-small .a-icon-alt");
      let rating: number | undefined;
      if (ratingElement) {
        const ratingText = (await ratingElement.textContent()) || "";
        const ratingMatch = ratingText.match(/([\d.]+)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
      }

      // 提取评价数量
      const reviewElement = await element.$('a[href*="#customerReviews"] span');
      let reviewCount: number | undefined;
      if (reviewElement) {
        const reviewText = (await reviewElement.textContent()) || "";
        const reviewMatch = reviewText.replace(/,/g, "").match(/(\d+)/);
        if (reviewMatch) {
          reviewCount = parseInt(reviewMatch[1], 10);
        }
      }

      // 构建商品链接
      const url = `https://www.${this.config.domain}/dp/${asin}`;

      return {
        name: name.trim(),
        price,
        currency,
        asin,
        url,
        image,
        rating,
        reviewCount,
      };
    } catch (error) {
      logger.warn(`提取商品信息失败: ${error}`);
      return null;
    }
  }

  /**
   * 从商品详情页 URL 提取商品信息
   * @param url - 商品详情页 URL
   * @returns 商品信息
   */
  async extractProductInfoFromUrl(url: string): Promise<AmazonProduct | null> {
    logger.info(`从 URL 提取商品信息: ${url}`);

    await this.initBrowser();

    if (!this.page) {
      throw new Error("浏览器页面未初始化");
    }

    try {
      // 访问商品页面
      await this.page.goto(url, { waitUntil: "networkidle" });

      // 等待页面加载
      await this.page.waitForSelector("#productTitle", { timeout: 10000 });

      // 提取 ASIN
      const asinMatch = url.match(/\/dp\/(\w{10})/i);
      const asin = asinMatch ? asinMatch[1] : "";

      if (!asin) {
        logger.warn(`无法从 URL 提取 ASIN: ${url}`);
        return null;
      }

      // 提取商品名称
      const name = await this.page.$eval("#productTitle", (el) => el.textContent?.trim() || "");

      // 提取价格
      let price: number | undefined;
      let currency = "USD";

      try {
        const priceText = await this.page.$eval(".a-price .a-offscreen", (el) =>
          el.textContent?.trim()
        );
        if (priceText) {
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
      } catch {
        // 价格可能不存在
      }

      // 提取图片
      let image: string | undefined;
      try {
        image = await this.page.$eval("#landingImage", (el) => el.getAttribute("src") || undefined);
      } catch {
        // 图片可能不存在
      }

      return {
        name: name || "Unknown Product",
        price,
        currency,
        asin,
        url,
        image,
      };
    } catch (error) {
      logger.warn(`从 URL 提取商品信息失败: ${url} - ${error}`);
      return null;
    }
  }

  /**
   * 批量搜索多个关键词
   * @param keywords - 关键词列表
   * @param limitPerKeyword - 每个关键词返回的商品数
   * @returns 商品列表（去重）
   */
  async searchByKeywords(
    keywords: string[],
    limitPerKeyword: number = 6
  ): Promise<AmazonProduct[]> {
    const allProducts: AmazonProduct[] = [];
    const seenAsins = new Set<string>();

    for (const keyword of keywords) {
      try {
        const products = await this.searchByKeyword(keyword, limitPerKeyword);

        for (const product of products) {
          if (!seenAsins.has(product.asin)) {
            seenAsins.add(product.asin);
            allProducts.push(product);
          }
        }
      } catch (error) {
        logger.error(`搜索关键词 "${keyword}" 失败: ${error}`);
        // 继续搜索下一个关键词
      }
    }

    return allProducts;
  }
}

/**
 * 创建 Amazon 搜索服务实例
 */
export function createAmazonSearchService(
  config?: Partial<AmazonSearchConfig>
): AmazonSearchService {
  return new AmazonSearchService(config);
}
