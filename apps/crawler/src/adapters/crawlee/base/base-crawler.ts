/**
 * Crawlee 基础爬虫类
 * 提供通用的 Crawlee 配置和反检测功能
 */

import { PlaywrightCrawler, Dataset, type Request } from "crawlee";
import { createLoggerInstance } from "@good-trending/shared";
import { getStealthInitFunction } from "../../../infrastructure/index.js";

const logger = createLoggerInstance("base-crawlee-crawler");

/**
 * Crawlee 基础配置
 */
export interface BaseCrawleeConfig {
  /** 爬虫名称 */
  name: string;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 最大重试次数 */
  maxRequestRetries?: number;
  /** 请求超时（秒） */
  requestHandlerTimeoutSecs?: number;
  /** 每个爬虫最大请求数 */
  maxRequestsPerCrawl?: number;
  /** 是否无头模式 */
  headless?: boolean;
}

/**
 * Crawlee 请求上下文类型
 */
export interface CrawleeRequestContext {
  request: Request;
  page: any;
  pushData: (data: any) => Promise<void>;
  log: any;
}

/**
 * Crawlee 基础爬虫类
 * 所有 Crawlee 实现继承此类
 */
export abstract class BaseCrawleeCrawler<T = unknown> {
  protected crawler: PlaywrightCrawler;
  protected dataset: Dataset;
  protected config: Required<BaseCrawleeConfig>;
  protected logger = logger;

  constructor(config: BaseCrawleeConfig) {
    this.config = {
      maxConcurrency: 3,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 100,
      headless: true,
      ...config,
    };

    this.dataset = new Dataset(`${config.name}-results`);
    this.crawler = this.createCrawler();
  }

  /**
   * 创建 Crawlee 爬虫实例
   */
  private createCrawler(): PlaywrightCrawler {
    return new PlaywrightCrawler({
      name: this.config.name,
      maxConcurrency: this.config.maxConcurrency,
      maxRequestRetries: this.config.maxRequestRetries,
      requestHandlerTimeoutSecs: this.config.requestHandlerTimeoutSecs,
      maxRequestsPerCrawl: this.config.maxRequestsPerCrawl,

      // 浏览器配置（反检测）
      launchContext: {
        launchOptions: {
          headless: this.config.headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
          ],
        },
      },

      // 预导航钩子 - 注入反检测脚本
      preNavigationHooks: [
        async ({ page }) => {
          await page.addInitScript(getStealthInitFunction());
        },
      ],

      // 请求处理器 - 子类实现
      requestHandler: async (context: CrawleeRequestContext) => {
        await this.handleRequest(context);
      },

      // 失败处理器
      failedRequestHandler: async ({ request }) => {
        this.logger.error(`请求失败: ${request.url}`, {
          retryCount: request.retryCount,
          error: request.errorMessages,
        });
      },
    });
  }

  /**
   * 抽象方法：子类实现具体的请求处理逻辑
   */
  protected abstract handleRequest(context: CrawleeRequestContext): Promise<void>;

  /**
   * 添加请求到队列
   */
  async addRequests(
    urls: Array<{ url: string; label?: string; userData?: any }>
  ): Promise<void> {
    await this.crawler.addRequests(
      urls.map((item) => ({
        url: item.url,
        label: item.label || item.url,
        userData: item.userData,
      }))
    );
  }

  /**
   * 运行爬虫
   */
  async run(): Promise<void> {
    await this.crawler.run();
  }

  /**
   * 获取数据集结果
   */
  async getData(): Promise<{ items: T[] }> {
    return this.dataset.getData() as Promise<{ items: T[] }>;
  }

  /**
   * 清空数据集
   */
  async clearData(): Promise<void> {
    await this.dataset.drop();
  }

  /**
   * 关闭爬虫
   * Crawlee 自动管理资源，无需手动关闭浏览器
   */
  async close(): Promise<void> {
    this.logger.info(`${this.config.name} 爬虫已关闭`);
  }
}
