/**
 * 类目热度任务 - 爬虫实现
 * 搜索各平台统计类目热度
 */

import type { Page, Browser } from "playwright";
import { chromium } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import { createGoogleSearch, type IGoogleSearch } from "@good-trending/crawler";
import type {
  CategoryHeatConfig,
  CategoryData,
  CategoryHeatResult,
  CategoryHeatCrawlResult,
} from "./types.js";

const logger = createLoggerInstance("category-heat-crawler");

/**
 * 搜索平台类型
 */
type SearchPlatform = "REDDIT" | "X_PLATFORM";

/**
 * 类目热度爬虫
 */
export class CategoryHeatCrawler {
  private config: Required<CategoryHeatConfig>;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private googleSearch: IGoogleSearch;

  constructor(config: Partial<CategoryHeatConfig> = {}) {
    this.config = {
      headless: true,
      maxResultsPerCategory: 30,
      searchDelayRange: [5000, 10000],
      saveToDb: true,
      ...config,
    };
    // 使用工厂创建 Google 搜索实例（支持 Legacy/Crawlee 切换）
    this.googleSearch = createGoogleSearch();
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

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    logger.info("爬虫资源已释放");
  }

  /**
   * 执行类目热度爬取
   */
  async crawl(categories: CategoryData[]): Promise<CategoryHeatCrawlResult> {
    const startTime = Date.now();
    const results: CategoryHeatResult[] = [];
    const errors: string[] = [];

    logger.info(`开始爬取 ${categories.length} 个类目的热度数据`);

    // 初始化浏览器
    await this.initBrowser();

    const today = new Date();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const result = await this.searchCategoryHeat(category, today);
        if (result) {
          results.push(result);
          logger.info(
            `类目 "${category.name}": Reddit=${result.redditResultCount}, X=${result.xResultCount}`
          );
        }
      } catch (error) {
        const errorMsg = `爬取类目 "${category.name}" 失败: ${error}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;

    logger.info(`类目热度爬取完成: ${results.length} 个类目, ${errors.length} 个错误`);

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      duration,
    };
  }

  /**
   * 搜索单个类目的热度
   */
  private async searchCategoryHeat(
    category: CategoryData,
    date: Date
  ): Promise<CategoryHeatResult | null> {
    const keyword = category.searchKeywords || category.name;
    const dateStr = this.formatDate(date);

    try {
      // 搜索 Reddit
      const redditQuery = this.buildSearchQuery(keyword, "REDDIT", dateStr);
      const redditResult = await this.googleSearch.search(redditQuery, this.page || undefined);

      await this.delay(1000);

      // 搜索 X
      const xQuery = this.buildSearchQuery(keyword, "X_PLATFORM", dateStr);
      const xResult = await this.googleSearch.search(xQuery, this.page || undefined);

      return {
        categoryId: category.id,
        categoryName: category.name,
        statDate: date,
        redditResultCount: redditResult.success ? redditResult.totalResults : 0,
        xResultCount: xResult.success ? xResult.totalResults : 0,
      };
    } catch (error) {
      logger.error(`搜索类目热度失败: ${error}`);
      return null;
    }
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(keyword: string, platform: SearchPlatform, dateStr: string): string {
    const siteMap = {
      REDDIT: "site:reddit.com",
      X_PLATFORM: "site:x.com",
    };

    return `${siteMap[platform]} "${keyword}" after:${dateStr}`;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}
