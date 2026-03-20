/**
 * Legacy 爬虫基类
 *
 * 基于原生 Playwright 实现的爬虫基类，与基于 Crawlee 框架的 BaseCrawleeCrawler 并列。
 * 特点：直接管理 Browser / BrowserContext / Page 生命周期，适合需要细粒度控制的场景。
 *
 * 架构位置：adapters/legacy/base → adapters/legacy/{google,reddit,amazon}
 *
 * 与 BaseCrawleeCrawler 的区别：
 * - Legacy：原生 Playwright，手动管理浏览器，适合需要复用外部 Page 的场景（如 Reddit）
 * - Crawlee：基于 crawlee 框架，内置队列 / 重试 / 并发管理
 *
 * @see adapters/crawlee/base/BaseCrawleeCrawler.ts 对应的 Crawlee 基类
 */
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { Logger } from "winston";

/**
 * 爬虫配置接口
 */
export interface CrawlerConfig {
  /** 头部信息 */
  headers?: Record<string, string>;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 是否启用代理 */
  proxy?: string;
  /** 请求间隔 (毫秒) */
  requestDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用无头模式 */
  headless?: boolean;
}

/**
 * 爬虫结果接口
 */
export interface CrawlResult<T> {
  /** 数据 */
  data: T[];
  /** 总数量 */
  total: number;
  /** 错误信息 */
  errors: string[];
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 耗时 (毫秒) */
  duration: number;
}

/**
 * 爬虫状态
 */
export enum CrawlerStatus {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

/**
 * 基础爬虫类
 * 所有爬虫实现都应继承此类
 */
export abstract class BaseLegacyCrawler<T> {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected status: CrawlerStatus = CrawlerStatus.IDLE;
  protected config: Required<CrawlerConfig>;
  protected abstract logger: Logger;

  /** 默认配置 */
  private static readonly DEFAULT_CONFIG: Required<CrawlerConfig> = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 30000,
    proxy: "",
    requestDelay: 1000,
    maxRetries: 3,
    headless: true,
  };

  constructor(config: CrawlerConfig = {}) {
    this.config = {
      ...BaseLegacyCrawler.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * 获取浏览器启动选项
   * 子类可以覆盖此方法自定义启动参数
   */
  protected getBrowserLaunchOptions(): Parameters<typeof chromium.launch>[0] {
    const options: Parameters<typeof chromium.launch>[0] = {
      headless: this.config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-infobars",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-first-run",
        "--safebrowsing-disable-auto-update",
        "--password-store=basic",
        "--use-mock-keychain",
        "--force-color-profile=srgb",
      ],
    };

    if (this.config.proxy) {
      options.proxy = {
        server: this.config.proxy,
      };
    }

    return options;
  }

  /**
   * 初始化浏览器
   */
  async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    const launchOptions = this.getBrowserLaunchOptions();
    this.browser = await chromium.launch(launchOptions);

    const contextOptions: Parameters<Browser["newContext"]>[0] = {
      userAgent: this.config.headers["User-Agent"],
      locale: "en-US",
      viewport: { width: 1920, height: 1080 },
    };

    this.context = await this.browser.newContext(contextOptions);

    // 设置默认超时
    this.context.setDefaultTimeout(this.config.timeout);

    this.page = await this.context.newPage();

    // 调用页面创建钩子（子类可覆盖）
    await this.onPageCreated();

    // 设置请求拦截
    await this.setupRequestInterception();

    this.logger.info("Browser initialized successfully");
  }

  /**
   * 页面创建后的钩子方法
   * 子类可以覆盖此方法在页面创建后执行自定义逻辑
   */
  protected async onPageCreated(): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 设置请求拦截
   */
  protected async setupRequestInterception(): Promise<void> {
    if (!this.page) {
      return;
    }

    // 阻止不必要的资源加载以提高性能
    await this.page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();
      if (["image", "font", "media"].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.logger.info("Browser closed");
  }

  /**
   * 延迟
   */
  protected async delay(ms?: number): Promise<void> {
    const delayTime = ms ?? this.config.requestDelay;
    await new Promise((resolve) => setTimeout(resolve, delayTime));
  }

  /**
   * 带重试的页面导航
   * @param url 目标 URL
   * @param waitUntil 页面加载完成条件，默认为 'networkidle'，对于动态页面建议使用 'domcontentloaded'
   */
  protected async navigateWithRetry(
    url: string,
    waitUntil: "networkidle" | "domcontentloaded" | "load" = "networkidle"
  ): Promise<boolean> {
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        this.logger.debug(
          `Navigating to: ${url} (attempt ${retries + 1}, waitUntil: ${waitUntil})`
        );

        await this.page?.goto(url, {
          waitUntil,
          timeout: this.config.timeout,
        });

        return true;
      } catch (error) {
        retries++;
        this.logger.warn(
          `Navigation failed (attempt ${retries}/${this.config.maxRetries}): ${error}`
        );

        if (retries >= this.config.maxRetries) {
          this.logger.error(`Max retries reached for URL: ${url}`);
          return false;
        }

        await this.delay(2000 * retries); // 递增延迟
      }
    }

    return false;
  }

  /**
   * 获取当前状态
   */
  getStatus(): CrawlerStatus {
    return this.status;
  }

  /**
   * 执行爬虫
   */
  async execute(): Promise<CrawlResult<T>> {
    const startTime = new Date();
    const errors: string[] = [];
    let data: T[] = [];

    this.status = CrawlerStatus.RUNNING;

    try {
      await this.initBrowser();
      data = await this.crawl();
      this.status = CrawlerStatus.COMPLETED;
    } catch (error) {
      this.status = CrawlerStatus.FAILED;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      this.logger.error(`Crawler failed: ${errorMessage}`);
    } finally {
      await this.closeBrowser();
    }

    const endTime = new Date();

    return {
      data,
      total: data.length,
      errors,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * 爬取数据的抽象方法
   * 子类必须实现此方法
   */
  protected abstract crawl(): Promise<T[]>;

  /**
   * 获取爬虫名称
   */
  abstract getName(): string;

  /**
   * 获取爬虫支持的数据源类型
   */
  abstract getSourceType(): string;
}
