import { createLogger, format, transports, Logger } from "winston";
import { BaseCrawler, CrawlResult } from "./base";

/**
 * 商品数据接口
 */
export interface ProductData {
  name: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: "X_PLATFORM" | "AMAZON";
}

/**
 * 爬虫管理器配置
 */
export interface CrawlerManagerConfig {
  /** 并发数 */
  concurrency?: number;
  /** 日志级别 */
  logLevel?: string;
}

/**
 * 爬虫管理器
 * 管理多个爬虫实例的执行
 */
export class CrawlerManager {
  private crawlers: Map<string, BaseCrawler<ProductData>> = new Map();
  private logger: Logger;
  private config: Required<CrawlerManagerConfig>;

  constructor(config: CrawlerManagerConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 1,
      logLevel: config.logLevel ?? "info",
    };

    this.logger = createLogger({
      level: this.config.logLevel,
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack }) => {
          return stack
            ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
            : `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
      ),
      transports: [
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
      ],
    });
  }

  /**
   * 注册爬虫
   */
  register(name: string, crawler: BaseCrawler<ProductData>): void {
    if (this.crawlers.has(name)) {
      this.logger.warn(`Crawler "${name}" already exists, overwriting`);
    }
    this.crawlers.set(name, crawler);
    this.logger.info(`Registered crawler: ${name}`);
  }

  /**
   * 注销爬虫
   */
  unregister(name: string): boolean {
    const result = this.crawlers.delete(name);
    if (result) {
      this.logger.info(`Unregistered crawler: ${name}`);
    }
    return result;
  }

  /**
   * 获取所有注册的爬虫名称
   */
  getRegisteredCrawlers(): string[] {
    return Array.from(this.crawlers.keys());
  }

  /**
   * 执行单个爬虫
   */
  async runCrawler(name: string): Promise<CrawlResult<ProductData> | null> {
    const crawler = this.crawlers.get(name);

    if (!crawler) {
      this.logger.error(`Crawler "${name}" not found`);
      return null;
    }

    this.logger.info(`Starting crawler: ${name}`);
    const result = await crawler.execute();

    this.logger.info(
      `Crawler "${name}" completed: ${result.total} items, ${result.errors.length} errors, ${result.duration}ms`
    );

    return result;
  }

  /**
   * 执行所有爬虫
   */
  async runAll(): Promise<Map<string, CrawlResult<ProductData>>> {
    const results = new Map<string, CrawlResult<ProductData>>();

    for (const [name] of this.crawlers) {
      const result = await this.runCrawler(name);
      if (result) {
        results.set(name, result);
      }
    }

    return results;
  }

  /**
   * 并行执行多个爬虫
   */
  async runParallel(names?: string[]): Promise<Map<string, CrawlResult<ProductData>>> {
    const results = new Map<string, CrawlResult<ProductData>>();

    const crawlerNames = names ?? Array.from(this.crawlers.keys());
    const crawlersToRun = crawlerNames
      .map((name) => ({ name, crawler: this.crawlers.get(name) }))
      .filter(
        (item): item is { name: string; crawler: BaseCrawler<ProductData> } =>
          item.crawler !== undefined
      );

    const promises = crawlersToRun.map(async ({ name, crawler }) => {
      this.logger.info(`Starting crawler: ${name}`);
      const result = await crawler.execute();
      this.logger.info(
        `Crawler "${name}" completed: ${result.total} items, ${result.errors.length} errors`
      );
      return { name, result };
    });

    const settled = await Promise.allSettled(promises);

    for (const item of settled) {
      if (item.status === "fulfilled") {
        results.set(item.value.name, item.value.result);
      } else {
        this.logger.error(`Crawler failed: ${item.reason}`);
      }
    }

    return results;
  }

  /**
   * 获取爬虫状态
   */
  getCrawlerStatus(name: string): string | null {
    const crawler = this.crawlers.get(name);
    return crawler ? crawler.getStatus() : null;
  }

  /**
   * 获取所有爬虫状态
   */
  getAllStatus(): Map<string, string> {
    const status = new Map<string, string>();
    for (const [name, crawler] of this.crawlers) {
      status.set(name, crawler.getStatus());
    }
    return status;
  }
}
