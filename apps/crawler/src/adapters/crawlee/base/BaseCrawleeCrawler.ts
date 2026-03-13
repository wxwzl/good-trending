/**
 * Crawlee 爬虫基类
 * 提供通用配置和工具方法
 */

import { PlaywrightCrawler, type PlaywrightCrawlerOptions } from "crawlee";
import type { Browser, Page } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import { getStealthInitFunction } from "../../../infrastructure/index.js";

const logger = createLoggerInstance("base-crawlee-crawler");

/**
 * 基础 Crawlee 配置
 */
export interface BaseCrawleeConfig {
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 最大重试次数 */
  maxRequestRetries?: number;
  /** 请求处理超时(秒) */
  requestHandlerTimeoutSecs?: number;
  /** 每次爬取最大请求数 */
  maxRequestsPerCrawl?: number;
  /** 是否无头模式 */
  headless?: boolean;
  /** 浏览器超时(毫秒) */
  timeout?: number;
}

/**
 * Crawlee 请求上下文
 */
export interface CrawleeRequestContext {
  /** 请求对象 */
  request: { url: string; label?: string };
  /** Playwright 页面对象 */
  page: Page;
  /** 浏览器对象 */
  browser: Browser;
}

/**
 * Crawlee 爬虫基类
 * 统一浏览器配置、反检测、日志等基础能力
 */
export abstract class BaseCrawleeCrawler {
  protected crawler: PlaywrightCrawler | null = null;
  protected config: Required<BaseCrawleeConfig>;
  protected logger = logger;

  /**
   * 默认配置
   */
  protected static readonly DEFAULT_CONFIG: Required<BaseCrawleeConfig> = {
    maxConcurrency: 2,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
    maxRequestsPerCrawl: 50,
    headless: true,
    timeout: 30000,
  };

  /**
   * 浏览器启动参数(反检测)
   */
  protected static readonly BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-web-security",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--window-size=1920,1080",
  ];

  constructor(config: BaseCrawleeConfig = {}) {
    this.config = { ...BaseCrawleeCrawler.DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取 Crawlee 配置选项
   * 子类可以覆盖此方法添加自定义配置
   */
  protected getCrawlerOptions(): PlaywrightCrawlerOptions {
    return {
      maxConcurrency: this.config.maxConcurrency,
      maxRequestRetries: this.config.maxRequestRetries,
      requestHandlerTimeoutSecs: this.config.requestHandlerTimeoutSecs,
      maxRequestsPerCrawl: this.config.maxRequestsPerCrawl,

      launchContext: {
        launchOptions: {
          headless: this.config.headless,
          args: BaseCrawleeCrawler.BROWSER_ARGS,
        },
      },

      preNavigationHooks: [
        async ({ page }) => {
          await page.addInitScript(getStealthInitFunction());
        },
      ],

      requestHandler: this.handleRequest.bind(this),

      failedRequestHandler: async ({ request }) => {
        this.logger.error(`请求失败: ${request.url}`);
      },
    };
  }

  /**
   * 请求处理器
   * 子类必须实现此方法处理具体爬取逻辑
   */
  protected abstract handleRequest(context: CrawleeRequestContext): Promise<void>;

  /**
   * 初始化爬虫
   */
  protected initCrawler(): void {
    if (this.crawler) {
      return;
    }
    this.crawler = new PlaywrightCrawler(this.getCrawlerOptions());
  }

  /**
   * 运行爬虫
   * @param urls 要爬取的 URL 列表
   */
  protected async runCrawler(urls: Array<{ url: string; label?: string }>): Promise<void> {
    this.initCrawler();
    if (!this.crawler) {
      throw new Error("爬虫未初始化");
    }
    await this.crawler.run(urls);
  }

  /**
   * 关闭爬虫
   */
  async close(): Promise<void> {
    if (this.crawler) {
      // Crawlee 会自动清理资源
      this.logger.info("爬虫已关闭");
    }
  }

  /**
   * 随机延迟(反检测)
   * @param min 最小延迟(ms)
   * @param max 最大延迟(ms)
   */
  protected async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * 等待元素出现
   * @param page Playwright 页面
   * @param selector CSS 选择器
   * @param timeout 超时时间(ms)
   */
  protected async waitForSelector(page: Page, selector: string, timeout?: number): Promise<void> {
    await page.waitForSelector(selector, {
      timeout: timeout || this.config.timeout,
    });
  }

  /**
   * 安全点击元素(带重试)
   * @param page Playwright 页面
   * @param selector CSS 选择器
   * @param maxRetries 最大重试次数
   */
  protected async safeClick(
    page: Page,
    selector: string,
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          return true;
        }
      } catch {
        // 重试
      }
      await this.randomDelay(500, 1000);
    }
    return false;
  }

  /**
   * 提取文本内容
   * @param page Playwright 页面
   * @param selector CSS 选择器
   * @returns 文本内容
   */
  protected async extractText(page: Page, selector: string): Promise<string> {
    try {
      return (await page.$eval(selector, (el) => el.textContent)) || "";
    } catch {
      return "";
    }
  }

  /**
   * 提取属性值
   * @param page Playwright 页面
   * @param selector CSS 选择器
   * @param attribute 属性名
   * @returns 属性值
   */
  protected async extractAttribute(
    page: Page,
    selector: string,
    attribute: string
  ): Promise<string> {
    try {
      const element = await page.$(selector);
      if (element) {
        return (await element.getAttribute(attribute)) || "";
      }
    } catch {
      // 忽略错误
    }
    return "";
  }
}
