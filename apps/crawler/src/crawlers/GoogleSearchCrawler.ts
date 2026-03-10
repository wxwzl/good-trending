/**
 * Google 搜索爬虫
 * 实现类目热度统计、商品发现、社交提及统计功能
 *
 * 搜索规则（根据 dataStructure.md）:
 * - Reddit 平台: site:reddit.com {keyword} after:{date}
 * - X 平台: site:x.com {keyword} after:{date}
 *
 * 使用 SerpAPI 优先，失败时回退到浏览器爬取
 */

import type { Browser } from "playwright";
import { Logger } from "winston";
import { createLoggerInstance } from "@good-trending/shared";
import { BaseCrawler, type CrawlerConfig, type CrawlResult } from "./BaseCrawler";
import {
  type CategoryHeatResult,
  type CrawledProduct,
  type SearchPlatform,
  type CategoryData,
} from "../types/crawler.types";

/**
 * 类目爬取配置
 */
export interface CategoryCrawlConfig {
  /** 同时处理的类目数 */
  concurrency?: number;
  /** 每个类目最大爬取结果数 */
  maxResultsPerCategory?: number;
  /** 每个类目提取的最大商品数 */
  maxProductsPerCategory?: number;
  /** 搜索延迟范围 (毫秒) */
  searchDelayRange?: [number, number];
}

/**
 * 爬虫执行结果
 * 继承自 CrawlResult，添加成功状态
 */
export interface CrawlerExecutionResult<T> extends CrawlResult<T> {
  /** 是否成功 */
  success: boolean;
}
import { GoogleSearchService, type SearchResult } from "../services/google-search-service";
import { formatDate } from "../utils/date";

/**
 * Google 搜索爬虫配置
 */
export interface GoogleSearchCrawlerConfig extends CrawlerConfig {
  /** 类目爬取配置 */
  categoryConfig: CategoryCrawlConfig;
  /** 是否使用英文搜索 */
  useEnglishResults?: boolean;
  /** SerpAPI 配置 */
  serpApiKey?: string;
  /** 强制使用浏览器（绕过 SerpAPI） */
  forceBrowser?: boolean;
}

/**
 * Google 搜索爬虫
 * 负责:
 * 1. 类目热度统计 - 搜索 Reddit/X 返回结果数
 * 2. 商品发现 - 从搜索结果中提取亚马逊商品
 * 3. 社交提及统计 - 搜索商品名称的结果数
 *
 * 优先使用 SerpAPI，失败时回退到浏览器
 */
export class GoogleSearchCrawler extends BaseCrawler<CrawledProduct> {
  protected logger: Logger;
  private searchConfig: Required<GoogleSearchCrawlerConfig>;
  private searchService: GoogleSearchService;

  constructor(
    crawlerConfig: CrawlerConfig = {},
    searchConfig: Partial<GoogleSearchCrawlerConfig> = {}
  ) {
    super(crawlerConfig);

    this.searchConfig = {
      headless: searchConfig.headless ?? true,
      requestDelay: searchConfig.requestDelay ?? 2000,
      maxRetries: searchConfig.maxRetries ?? 3,
      timeout: searchConfig.timeout ?? 30000,
      proxy: searchConfig.proxy ?? "",
      headers: searchConfig.headers ?? {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      categoryConfig: {
        concurrency: searchConfig.categoryConfig?.concurrency ?? 1,
        maxResultsPerCategory: searchConfig.categoryConfig?.maxResultsPerCategory ?? 30,
        maxProductsPerCategory: searchConfig.categoryConfig?.maxProductsPerCategory ?? 10,
        // 增加延迟范围，降低被检测风险
        searchDelayRange: searchConfig.categoryConfig?.searchDelayRange ?? [5000, 10000],
      },
      useEnglishResults: searchConfig.useEnglishResults ?? true,
      serpApiKey: searchConfig.serpApiKey ?? process.env.SERPAPI_KEY ?? "",
      forceBrowser: searchConfig.forceBrowser ?? false,
    };

    // 初始化搜索服务
    this.searchService = new GoogleSearchService({
      serpApi: {
        apiKey: this.searchConfig.serpApiKey,
        engine: "google",
      },
      browser: {
        headless: this.searchConfig.headless,
        timeout: this.searchConfig.timeout,
        proxy: this.searchConfig.proxy,
      },
      forceBrowser: this.searchConfig.forceBrowser,
    });

    this.logger = createLoggerInstance("google-search-crawler");
  }

  /**
   * 初始化浏览器（增强版，带 Stealth 注入）
   */
  async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    const { chromium } = await import("playwright");

    const launchOptions: Parameters<typeof chromium.launch>[0] = {
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
      launchOptions.proxy = {
        server: this.config.proxy,
      };
    }

    this.browser = await chromium.launch(launchOptions);

    const contextOptions: Parameters<Browser["newContext"]>[0] = {
      userAgent: this.config.headers["User-Agent"],
      locale: "en-US",
      viewport: { width: 1920, height: 1080 },
    };

    this.context = await this.browser.newContext(contextOptions);
    this.context.setDefaultTimeout(this.config.timeout);
    this.page = await this.context.newPage();

    // 注入 Stealth 脚本隐藏自动化特征
    await this.injectStealthScript();

    // 设置请求拦截
    await this.setupRequestInterception();

    this.logger.info("Browser initialized with enhanced stealth mode");
  }

  /**
   * 注入 Stealth 脚本隐藏自动化特征
   */
  private async injectStealthScript(): Promise<void> {
    if (!this.page) {
      return;
    }

    await this.page.addInitScript(() => {
      // 覆盖 navigator.webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
        configurable: true,
      });

      // 模拟 Chrome 运行时
      (window as any).chrome = {
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: "chrome_update",
            INSTALL: "install",
            SHARED_MODULE_UPDATE: "shared_module_update",
            UPDATE: "update",
          },
          OnRestartRequiredReason: {
            APP_UPDATE: "app_update",
            OS_UPDATE: "os_update",
            PERIODIC: "periodic",
          },
          PlatformArch: {
            ARM: "arm",
            ARM64: "arm64",
            MIPS: "mips",
            MIPS64: "mips64",
            MIPS64EL: "mips64el",
            MIPSel: "mipsel",
            X86_32: "x86-32",
            X86_64: "x86-64",
          },
          PlatformNaclArch: {
            ARM: "arm",
            MIPS: "mips",
            MIPS64: "mips64",
            MIPS64EL: "mips64el",
            MIPSel: "mipsel",
            Mips64: "mips64",
            Mips64El: "mips64el",
            X86_32: "x86-32",
            X86_64: "x86-64",
          },
          PlatformOs: {
            ANDROID: "android",
            CROS: "cros",
            LINUX: "linux",
            MAC: "mac",
            OPENBSD: "openbsd",
            WIN: "win",
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: "no_update",
            THROTTLED: "throttled",
            UPDATE_AVAILABLE: "update_available",
          },
        },
      };

      // 模拟插件
      Object.defineProperty(navigator, "plugins", {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Viewer",
          },
        ],
      });

      // 模拟语言
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en", "zh-CN", "zh"],
      });

      // 隐藏 Playwright 特有的属性
      delete (window as any).__playwright;
      delete (window as any).__pw_manual;
      delete (window as any).__PW_inspect;

      // 覆盖 Permissions API
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = async (parameters: PermissionDescriptor) => {
        if (parameters.name === "notifications") {
          return { state: Notification.permission, onchange: null } as PermissionStatus;
        }
        return originalQuery.call(window.navigator.permissions, parameters);
      };
    });
  }

  getName(): string {
    return "GoogleSearchCrawler";
  }

  getSourceType(): string {
    return "GOOGLE_SEARCH";
  }

  /**
   * 爬取类目热度数据
   * 对每个类目搜索 Reddit 和 X 平台，记录结果数
   */
  async crawlCategoryHeat(
    categories: CategoryData[],
    date: Date = new Date()
  ): Promise<CrawlerExecutionResult<CategoryHeatResult>> {
    const startTime = new Date();
    const results: CategoryHeatResult[] = [];
    const errors: string[] = [];

    this.logger.info(`开始爬取 ${categories.length} 个类目的热度数据`);

    // 初始化浏览器
    await this.initBrowser();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const result = await this.searchCategoryHeat(category, date);
        if (result) {
          results.push(result);
          this.logger.info(
            `类目 "${category.name}": Reddit=${result.redditResultCount}, X=${result.xResultCount}`
          );
        }
      } catch (error) {
        const errorMsg = `爬取类目 "${category.name}" 失败: ${error}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const endTime = new Date();

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * 爬取商品（通过类目搜索）
   * 搜索每个类目，从结果中提取亚马逊商品
   */
  async crawlProductsByCategory(
    categories: CategoryData[],
    date: Date = new Date()
  ): Promise<CrawlerExecutionResult<CrawledProduct>> {
    const startTime = new Date();
    const results: CrawledProduct[] = [];
    const errors: string[] = [];
    const seenAsins = new Set<string>();

    this.logger.info(`开始从 ${categories.length} 个类目搜索商品`);

    // 初始化浏览器
    await this.initBrowser();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const products = await this.searchAndExtractProducts(category, date);

        for (const product of products) {
          // 去重
          if (!seenAsins.has(product.amazonId)) {
            seenAsins.add(product.amazonId);
            results.push(product);
          }
        }

        this.logger.info(`类目 "${category.name}" 发现 ${products.length} 个新商品`);
      } catch (error) {
        const errorMsg = `搜索类目 "${category.name}" 商品失败: ${error}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const endTime = new Date();

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * 爬取商品社交提及数
   * 对指定商品名称搜索 Reddit 和 X 平台
   */
  async crawlProductMentions(
    productName: string,
    date: Date = new Date()
  ): Promise<{
    redditCount: number;
    xCount: number;
    periodResults: Record<string, { reddit: number; x: number }>;
  }> {
    this.logger.info(`爬取商品 "${productName}" 的社交提及数据`);

    const periodResults: Record<string, { reddit: number; x: number }> = {};

    // 今日数据
    const todayStr = formatDate(date);
    periodResults["TODAY"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", todayStr),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", todayStr),
    };

    // 昨日数据
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    periodResults["YESTERDAY"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", yesterdayStr, todayStr),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", yesterdayStr, todayStr),
    };

    // 本周数据（周一到今天）
    const weekStart = this.getWeekStart(date);
    periodResults["THIS_WEEK"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(weekStart)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(weekStart)),
    };

    // 本月数据（1号到今天）
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    periodResults["THIS_MONTH"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(monthStart)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(monthStart)),
    };

    // 近7天
    const last7Days = new Date(date);
    last7Days.setDate(last7Days.getDate() - 7);
    periodResults["LAST_7_DAYS"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(last7Days)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(last7Days)),
    };

    // 近15天
    const last15Days = new Date(date);
    last15Days.setDate(last15Days.getDate() - 15);
    periodResults["LAST_15_DAYS"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(last15Days)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(last15Days)),
    };

    // 近30天
    const last30Days = new Date(date);
    last30Days.setDate(last30Days.getDate() - 30);
    periodResults["LAST_30_DAYS"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(last30Days)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(last30Days)),
    };

    // 近60天
    const last60Days = new Date(date);
    last60Days.setDate(last60Days.getDate() - 60);
    periodResults["LAST_60_DAYS"] = {
      reddit: await this.searchProductMentionCount(productName, "REDDIT", formatDate(last60Days)),
      x: await this.searchProductMentionCount(productName, "X_PLATFORM", formatDate(last60Days)),
    };

    return {
      redditCount: periodResults["TODAY"].reddit,
      xCount: periodResults["TODAY"].x,
      periodResults,
    };
  }

  /**
   * 爬取昨天一天的数据
   * 搜索: site:reddit.com 类目名称 after:昨天 before:今天
   */
  async crawlYesterdayCategoryHeat(
    categories: CategoryData[],
    date: Date = new Date()
  ): Promise<CrawlerExecutionResult<CategoryHeatResult>> {
    const startTime = new Date();
    const results: CategoryHeatResult[] = [];
    const errors: string[] = [];

    // 计算昨天日期
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(date);

    this.logger.info(`开始爬取 ${categories.length} 个类目的昨天数据 (${yesterdayStr})`);

    // 初始化浏览器
    await this.initBrowser();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const keyword = category.searchKeywords || category.name;

        // 搜索 Reddit（昨天一天）
        const redditQuery = this.buildSearchQuery(keyword, "REDDIT", yesterdayStr, todayStr);
        const redditResult = await this.performGoogleSearch(redditQuery);

        await this.delay(1000);

        // 搜索 X（昨天一天）
        const xQuery = this.buildSearchQuery(keyword, "X_PLATFORM", yesterdayStr, todayStr);
        const xResult = await this.performGoogleSearch(xQuery);

        results.push({
          categoryId: category.id,
          categoryName: category.name,
          statDate: yesterday,
          redditResultCount: 0, // 今天数据为0
          xResultCount: 0,
          yesterdayRedditCount: redditResult.totalResults,
          yesterdayXCount: xResult.totalResults,
        });

        this.logger.info(
          `类目 "${category.name}" 昨天数据: Reddit=${redditResult.totalResults}, X=${xResult.totalResults}`
        );
      } catch (error) {
        const errorMsg = `爬取类目 "${category.name}" 昨天数据失败: ${error}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const endTime = new Date();

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * 爬取昨天的商品（搜索昨天一天的数据）
   */
  async crawlYesterdayProducts(
    categories: CategoryData[],
    date: Date = new Date()
  ): Promise<CrawlerExecutionResult<CrawledProduct>> {
    const startTime = new Date();
    const results: CrawledProduct[] = [];
    const errors: string[] = [];
    const seenAsins = new Set<string>();

    // 计算昨天日期
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(date);

    this.logger.info(`开始从 ${categories.length} 个类目搜索昨天的商品`);

    // 初始化浏览器
    await this.initBrowser();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const keyword = category.searchKeywords || category.name;

        this.logger.info(`搜索类目 "${keyword}" 昨天的 Reddit 帖子`);

        // 搜索 Reddit（昨天一天）
        const redditQuery = this.buildSearchQuery(keyword, "REDDIT", yesterdayStr, todayStr);
        this.logger.info(`搜索查询: ${redditQuery}`);

        const redditResult = await this.performGoogleSearch(redditQuery);
        this.logger.info(`找到 ${redditResult.links.length} 个搜索结果`);

        // 从 Reddit 结果中提取亚马逊商品
        const maxResults = this.searchConfig.categoryConfig?.maxResultsPerCategory ?? 30;
        const redditProducts = await this.extractAmazonProductsFromLinks(
          redditResult.links.slice(0, maxResults)
        );

        for (const product of redditProducts) {
          // 去重
          if (!seenAsins.has(product.amazonId)) {
            seenAsins.add(product.amazonId);
            results.push({
              ...product,
              discoveredFromCategory: category.id,
              firstSeenAt: yesterday,
            });
          }
        }

        this.logger.info(`类目 "${category.name}" 发现 ${redditProducts.length} 个新商品`);
      } catch (error) {
        const errorMsg = `搜索类目 "${category.name}" 昨天商品失败: ${error}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const endTime = new Date();

    return {
      success: errors.length === 0,
      data: results,
      total: results.length,
      errors,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * 搜索类目热度
   */
  private async searchCategoryHeat(
    category: CategoryData,
    date: Date
  ): Promise<CategoryHeatResult | null> {
    const keyword = category.searchKeywords || category.name;
    const dateStr = formatDate(date);

    try {
      // 搜索 Reddit
      const redditQuery = this.buildSearchQuery(keyword, "REDDIT", dateStr);
      const redditResult = await this.performGoogleSearch(redditQuery);

      await this.delay(1000);

      // 搜索 X
      const xQuery = this.buildSearchQuery(keyword, "X_PLATFORM", dateStr);
      const xResult = await this.performGoogleSearch(xQuery);

      return {
        categoryId: category.id,
        categoryName: category.name,
        statDate: date,
        redditResultCount: redditResult.totalResults,
        xResultCount: xResult.totalResults,
      };
    } catch (error) {
      this.logger.error(`搜索类目热度失败: ${error}`);
      return null;
    }
  }

  /**
   * 搜索并提取商品
   * 搜索近30天的Reddit帖子
   */
  private async searchAndExtractProducts(
    category: CategoryData,
    date: Date
  ): Promise<CrawledProduct[]> {
    const keyword = category.searchKeywords || category.name;

    // 计算30天前的日期
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = formatDate(thirtyDaysAgo);

    this.logger.info(`搜索类目 "${keyword}" 近30天的Reddit帖子 (after:${afterDate})`);

    const products: CrawledProduct[] = [];

    try {
      // 搜索 Reddit（近30天）
      const redditQuery = this.buildSearchQuery(keyword, "REDDIT", afterDate);
      this.logger.info(`搜索查询: ${redditQuery}`);

      const redditResult = await this.performGoogleSearch(redditQuery);
      this.logger.info(`找到 ${redditResult.links.length} 个搜索结果`);

      // 从 Reddit 结果中提取亚马逊商品
      const maxResults = this.searchConfig.categoryConfig?.maxResultsPerCategory ?? 30;
      const redditProducts = await this.extractAmazonProductsFromLinks(
        redditResult.links.slice(0, maxResults)
      );

      for (const product of redditProducts) {
        products.push({
          ...product,
          discoveredFromCategory: category.id,
          firstSeenAt: date,
        });
      }

      return products;
    } catch (error) {
      this.logger.error(`搜索提取商品失败: ${error}`);
      return products;
    }
  }

  /**
   * 爬取类目热度和商品（合并处理）
   * 一次遍历同时获取热度数据和商品数据，避免重复搜索
   */
  async crawlCategoryHeatAndProducts(
    categories: CategoryData[],
    date: Date = new Date()
  ): Promise<{
    heatResults: CategoryHeatResult[];
    products: CrawledProduct[];
    success: boolean;
    errors: string[];
  }> {
    const heatResults: CategoryHeatResult[] = [];
    const products: CrawledProduct[] = [];
    const errors: string[] = [];
    const seenAsins = new Set<string>();

    this.logger.info(`开始合并爬取 ${categories.length} 个类目的热度数据和商品`);

    // 初始化浏览器
    await this.initBrowser();

    for (const category of categories) {
      try {
        await this.delay(this.getRandomDelay());

        const keyword = category.searchKeywords || category.name;
        const dateStr = formatDate(date);

        this.logger.info(`处理类目 "${category.name}": 搜索 + 提取商品`);

        // 搜索 Reddit
        const redditQuery = this.buildSearchQuery(keyword, "REDDIT", dateStr);
        const redditResult = await this.performGoogleSearch(redditQuery);

        await this.delay(1000);

        // 搜索 X
        const xQuery = this.buildSearchQuery(keyword, "X_PLATFORM", dateStr);
        const xResult = await this.performGoogleSearch(xQuery);

        // 记录类目热度
        heatResults.push({
          categoryId: category.id,
          categoryName: category.name,
          statDate: date,
          redditResultCount: redditResult.totalResults,
          xResultCount: xResult.totalResults,
        });

        this.logger.info(
          `类目 "${category.name}" 热度: Reddit=${redditResult.totalResults}, X=${xResult.totalResults}`
        );

        // 从 Reddit 结果中提取商品
        const maxResults = this.searchConfig.categoryConfig?.maxResultsPerCategory ?? 30;
        const extractedProducts = await this.extractAmazonProductsFromLinks(
          redditResult.links.slice(0, maxResults)
        );

        // 添加到结果（去重）
        for (const product of extractedProducts) {
          if (!seenAsins.has(product.amazonId)) {
            seenAsins.add(product.amazonId);
            products.push({
              ...product,
              discoveredFromCategory: category.id,
              firstSeenAt: date,
            });
          }
        }

        this.logger.info(`类目 "${category.name}" 提取 ${extractedProducts.length} 个新商品`);
      } catch (error) {
        const errorMsg = `处理类目 "${category.name}" 失败: ${error}`;
        this.logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      heatResults,
      products,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * 搜索商品提及数
   */
  private async searchProductMentionCount(
    productName: string,
    platform: SearchPlatform,
    afterDate: string,
    beforeDate?: string
  ): Promise<number> {
    try {
      const query = this.buildSearchQuery(productName, platform, afterDate, beforeDate);
      const result = await this.performGoogleSearch(query);
      return result.totalResults;
    } catch (error) {
      this.logger.error(`搜索商品提及数失败: ${error}`);
      return 0;
    }
  }

  /**
   * 执行 Google 搜索
   * 优先使用 SerpAPI，失败时回退到浏览器
   */
  async performGoogleSearch(
    query: string
  ): Promise<{ totalResults: number; links: SearchResult[]; source: "serpapi" | "browser" }> {
    this.logger.info(`执行搜索: ${query}`);

    // 确保浏览器已初始化
    if (!this.page) {
      await this.initBrowser();
    }

    // 使用搜索服务，传入当前页面的实例（复用浏览器）
    const result = await this.searchService.search(query, this.page || undefined);

    if (!result.success) {
      throw new Error(`搜索失败: ${result.error}`);
    }

    this.logger.info(`搜索完成，来源: ${result.source}, 结果数: ${result.links.length}`);

    return {
      totalResults: result.totalResults,
      links: result.links,
      source: result.source,
    };
  }

  /**
   * 从Reddit帖子链接中提取亚马逊商品
   * 步骤：
   * 1. 访问Reddit帖子
   * 2. 从帖子内容中提取亚马逊商品链接
   * 3. 访问亚马逊链接获取商品详情
   * 4. 可选：每提取一个商品立即保存（边爬边保存模式）
   */
  async extractAmazonProductsFromLinks(
    links: Array<{ title: string; url: string }>,
    onProductExtracted?: (
      product: Omit<CrawledProduct, "discoveredFromCategory" | "firstSeenAt">
    ) => Promise<void> | void
  ): Promise<Omit<CrawledProduct, "discoveredFromCategory" | "firstSeenAt">[]> {
    const products: Omit<CrawledProduct, "discoveredFromCategory" | "firstSeenAt">[] = [];
    const seenAsins = new Set<string>();
    let savedCount = 0;

    for (const link of links) {
      try {
        this.logger.info(`访问Reddit帖子: ${link.title.substring(0, 50)}...`);

        // 访问Reddit帖子
        const amazonLinks = await this.extractAmazonLinksFromRedditPost(link.url);

        this.logger.info(`  找到 ${amazonLinks.length} 个亚马逊链接`);

        // 处理每个亚马逊链接
        for (const amazonUrl of amazonLinks) {
          const asin = this.extractAsinFromUrl(amazonUrl);
          if (!asin || seenAsins.has(asin)) {
            continue;
          }

          this.logger.info(`  提取商品 ASIN: ${asin}`);

          // 访问亚马逊获取商品信息
          const productInfo = await this.extractAmazonProductInfo(amazonUrl);
          if (productInfo && !("error" in productInfo)) {
            seenAsins.add(asin);
            const product: Omit<CrawledProduct, "discoveredFromCategory" | "firstSeenAt"> = {
              name: productInfo.name,
              description: productInfo.description,
              price: productInfo.price
                ? parseFloat(productInfo.price.replace(/[^\d.]/g, ""))
                : undefined,
              currency: "USD",
              amazonId: asin,
              sourceUrl: amazonUrl,
            };

            products.push(product);
            this.logger.info(`  ✅ 成功提取商品: ${productInfo.name.substring(0, 50)}...`);

            // 如果提供了回调函数，立即保存商品（边爬边保存模式）
            if (onProductExtracted) {
              try {
                await onProductExtracted(product);
                savedCount++;
                this.logger.info(`  💾 已立即保存商品 (总计: ${savedCount})`);
              } catch (saveError) {
                this.logger.warn(`  ⚠️ 保存商品失败: ${saveError}`);
              }
            }
          }

          // 限制商品数量
          const maxProducts = this.searchConfig.categoryConfig?.maxProductsPerCategory ?? 10;
          if (products.length >= maxProducts) {
            this.logger.info(`  已达到最大商品数量限制 (${maxProducts})，停止提取`);
            return products;
          }
        }
      } catch (error) {
        this.logger.warn(`处理Reddit帖子失败 ${link.url}: ${error}`);
      }

      // 增加延迟避免被封（随机 5-10 秒）
      const delay = this.getRandomDelay();
      this.logger.info(`等待 ${delay}ms 后继续...`);
      await this.delay(delay);
    }

    this.logger.info(`提取完成: ${products.length} 个商品，已保存: ${savedCount} 个`);
    return products;
  }

  /**
   * 解析短链接获取真实URL
   * 支持 amzn.to 等短链接服务
   */
  private async resolveShortLink(shortUrl: string): Promise<string | null> {
    try {
      this.logger.info(`解析短链接: ${shortUrl}`);

      // 使用页面请求获取重定向后的URL
      const response = await this.page?.evaluate(async (url) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const resp = await fetch(url, {
            method: "HEAD",
            redirect: "manual",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return resp.headers.get("location") || null;
        } catch {
          return null;
        }
      }, shortUrl);

      if (response) {
        this.logger.info(`短链接解析成功: ${shortUrl} -> ${response}`);
        return response;
      }
    } catch (error) {
      this.logger.warn(`短链接解析失败 ${shortUrl}: ${error}`);
    }
    return null;
  }

  /**
   * 展开 Reddit 帖子内容
   * 点击 "Read more" 和 "View entire discussion" 按钮
   */
  private async expandRedditContent(): Promise<void> {
    if (!this.page) {
      return;
    }

    try {
      // 点击所有 "Read more" 按钮
      await this.page.evaluate(async () => {
        const readMoreButtons = document.querySelectorAll(
          'button[data-click-id="text"], button:has-text("Read more"), .text-neutral-content-weak'
        );
        for (const btn of Array.from(readMoreButtons)) {
          if (btn.textContent?.includes("Read more")) {
            (btn as HTMLElement).click();
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      });

      // 点击 "View more comments" / "Continue this thread"
      let moreCommentsExist = true;
      let attempts = 0;
      while (moreCommentsExist && attempts < 3) {
        moreCommentsExist = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll(
            'button:has-text("View more comments"), button:has-text("Continue this thread"), [data-testid="more-comments-button"]'
          );
          if (buttons.length > 0) {
            (buttons[0] as HTMLElement).click();
            return true;
          }
          return false;
        });
        if (moreCommentsExist) {
          await this.delay(1000);
          attempts++;
        }
      }
    } catch (error) {
      this.logger.warn(`展开 Reddit 内容失败: ${error}`);
    }
  }

  /**
   * 从Reddit帖子中提取亚马逊商品链接
   * 处理多种链接格式：
   * - 直接亚马逊链接: amazon.com/dp/ASIN
   * - 短链接: amzn.to/XXX
   * - Reddit 重定向链接: reddit.com/r/.../comments/.../...
   * - 规范化并过滤非商品链接
   */
  private async extractAmazonLinksFromRedditPost(url: string): Promise<string[]> {
    if (!this.page) {
      return [];
    }

    // 使用 domcontentloaded 而不是 networkidle，因为 Reddit 有很多持续的背景请求
    const success = await this.navigateWithRetry(url, "domcontentloaded");
    if (!success) {
      this.logger.warn(`导航到 Reddit 页面失败: ${url}`);
      return [];
    }

    // 等待页面加载（Reddit使用JavaScript渲染）- 增加随机延迟
    const pageLoadDelay = Math.floor(Math.random() * 3000) + 4000; // 4-7秒
    await this.delay(pageLoadDelay);

    // 展开所有 "Read more" 按钮
    await this.expandRedditContent();

    // 提取所有链接
    const rawLinks: string[] = await this.page.evaluate(() => {
      const links: string[] = [];

      // 1. 直接查找包含 amazon 的链接
      const amazonLinks = document.querySelectorAll('a[href*="amazon"]');
      amazonLinks.forEach((el) => {
        const href = el.getAttribute("href") || "";
        if (href && !href.startsWith("javascript:")) {
          links.push(href);
        }
      });

      // 2. 查找 amzn.to 短链接
      const shortLinks = document.querySelectorAll('a[href*="amzn.to"]');
      shortLinks.forEach((el) => {
        const href = el.getAttribute("href") || "";
        if (href) {
          links.push(href);
        }
      });

      // 3. 查找可能包含链接的文本内容
      const postContent = document.querySelector('[data-testid="post-content"], .Post, #t3_');
      if (postContent) {
        // 查找所有链接
        const allLinks = postContent.querySelectorAll("a");
        allLinks.forEach((el) => {
          const href = el.getAttribute("href") || "";
          if (href && (href.includes("amazon") || href.includes("amzn"))) {
            links.push(href);
          }
        });
      }

      // 4. 查找评论中的链接
      const commentLinks = document.querySelectorAll('[data-testid="comment"] a, .Comment a');
      commentLinks.forEach((el) => {
        const href = el.getAttribute("href") || "";
        if (href && (href.includes("amazon") || href.includes("amzn"))) {
          links.push(href);
        }
      });

      return links;
    });

    // 处理链接：去重、规范化、过滤
    const processedLinks = new Set<string>();
    const result: string[] = [];

    for (const link of rawLinks) {
      // 跳过已处理的
      if (processedLinks.has(link)) {
        continue;
      }
      processedLinks.add(link);

      // 处理短链接 (amzn.to)
      if (link.includes("amzn.to")) {
        const resolvedUrl = await this.resolveShortLink(link);
        if (resolvedUrl) {
          const cleanUrl = this.normalizeAmazonUrl(resolvedUrl);
          if (cleanUrl && !processedLinks.has(cleanUrl)) {
            processedLinks.add(cleanUrl);
            result.push(cleanUrl);
          }
        }
        continue;
      }

      // 解析链接
      try {
        const url = new URL(link);

        // 处理 Reddit 重定向链接
        if (url.hostname.includes("reddit.com") && url.searchParams.has("url")) {
          const redirectUrl = url.searchParams.get("url");
          if (redirectUrl) {
            const cleanUrl = this.normalizeAmazonUrl(redirectUrl);
            if (cleanUrl && !processedLinks.has(cleanUrl)) {
              processedLinks.add(cleanUrl);
              result.push(cleanUrl);
            }
          }
          continue;
        }

        // 处理 amp 链接
        if (url.hostname.startsWith("amp.")) {
          url.hostname = url.hostname.replace("amp.", "");
        }

        // 检查是否是有效的亚马逊商品链接
        const cleanUrl = this.normalizeAmazonUrl(url.toString());
        if (cleanUrl) {
          result.push(cleanUrl);
        }
      } catch {
        // URL 解析失败，检查是否包含 ASIN
        const asin = this.extractAsinFromUrl(link);
        if (asin) {
          const cleanUrl = `https://www.amazon.com/dp/${asin}`;
          if (!processedLinks.has(cleanUrl)) {
            processedLinks.add(cleanUrl);
            result.push(cleanUrl);
          }
        }
      }
    }

    this.logger.info(`从 Reddit 帖子提取到 ${result.length} 个亚马逊商品链接`);
    return result;
  }

  /**
   * 规范化亚马逊链接
   * 提取标准格式：https://www.amazon.com/dp/ASIN
   */
  private normalizeAmazonUrl(url: string): string | null {
    // 提取 ASIN
    const asin = this.extractAsinFromUrl(url);
    if (!asin) {
      return null;
    }

    // 构建标准链接
    return `https://www.amazon.com/dp/${asin}`;
  }

  /**
   * 提取亚马逊商品信息
   * 包含反爬虫错误处理和重试逻辑
   */
  private async extractAmazonProductInfo(url: string): Promise<{
    name: string;
    brand?: string;
    description?: string;
    price?: string;
    image?: string;
    rating?: string;
    reviewCount?: string;
    availability?: string;
  } | null> {
    if (!this.page) {
      return null;
    }

    // 使用智能重试导航
    const { success, antiBot } = await this.navigateWithSmartRetry(url, 3);
    if (!success) {
      if (antiBot) {
        this.logger.error(`反爬虫阻止，跳过商品: ${url}`);
      } else {
        this.logger.error(`导航失败，跳过商品: ${url}`);
      }
      return null;
    }

    return this.page.evaluate(() => {
      // 检查页面是否有效（不是错误页面）
      const errorSelectors = [
        "#g img", // 狗狗图片错误页
        '[src*="error"]', // 错误图片
        '.a-box-inner:has-text("not found")', // 商品未找到
        '.a-box-inner:has-text("unavailable")', // 商品不可用
      ];
      for (const sel of errorSelectors) {
        if (document.querySelector(sel)) {
          return { error: "page_error", name: "" };
        }
      }

      // 商品名称 - 尝试多种选择器
      let name: string | undefined;
      const nameSelectors = [
        "#productTitle",
        "#ebooksProductTitle",
        ".product-title",
        "h1.a-size-large",
        '[data-testid="product-title"]',
      ];
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          name = el.textContent.trim();
          break;
        }
      }

      if (!name) {
        return null;
      }

      // 品牌
      let brand: string | undefined;
      const brandSelectors = [
        "#bylineInfo",
        '.a-link-normal[href*="brand"]',
        '[data-testid="brand"]',
        'a[href*="field-brand"]',
      ];
      for (const selector of brandSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          brand = el.textContent.trim().replace("Brand: ", "").replace("Visit the ", "");
          break;
        }
      }

      // 价格 - 尝试更多选择器
      let price: string | undefined;
      const priceSelectors = [
        ".a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen", // 主要价格
        ".a-price .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#priceblock_saleprice",
        ".a-price-whole",
        '[data-a-color="price"] .a-offscreen',
        ".a-price-range",
        ".a-color-price",
        ".a-text-price .a-offscreen",
        ".kindle-price .a-offscreen", // Kindle价格
        '[data-testid="price"]',
      ];
      for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl?.textContent?.trim()) {
          price = priceEl.textContent.trim();
          break;
        }
      }

      // 库存状态
      let availability: string | undefined;
      const availabilitySelectors = [
        "#availability span",
        ".a-color-success",
        ".a-color-state",
        '[data-testid="availability-status"]',
      ];
      for (const selector of availabilitySelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          const text = el.textContent.trim().toLowerCase();
          if (text.includes("in stock") || text.includes("available")) {
            availability = "in_stock";
            break;
          } else if (text.includes("out of stock") || text.includes("unavailable")) {
            availability = "out_of_stock";
            break;
          }
        }
      }

      // 图片 - 优先获取高分辨率
      let image: string | undefined;
      const imgSelectors = [
        "#landingImage[data-old-hires]", // 高分辨率
        "#landingImage",
        "#imgBlkFront",
        "#ebooksImgBlkFront",
        "#hiResImage",
        "[data-old-hires]",
        "#main-image",
        ".a-dynamic-image",
        ".itemNo0.maintain-height img", // 另一种图片容器
      ];
      for (const selector of imgSelectors) {
        const imgEl = document.querySelector(selector);
        const src =
          imgEl?.getAttribute("data-old-hires") ||
          imgEl?.getAttribute("src") ||
          imgEl?.getAttribute("data-src");
        if (src && !src.includes("data:image") && !src.includes("grey-pixel")) {
          // 转换为高分辨率URL
          image = src.replace(/_\w+_\./, "_SL1500_."); // 尝试获取大图
          break;
        }
      }

      // 商品描述 - 增强提取
      let description = "";
      const bulletSelectors = [
        "#feature-bullets ul li span.a-list-item",
        "#feature-bullets ul li",
        ".a-unordered-list.a-nostyle li",
        "#productDescription p",
        "#productDescription span",
        '[data-feature-name="productDescription"]',
        "#bookDescription_feature_div", // 图书描述
        "#aplus_feature_div", // A+内容
      ];
      for (const selector of bulletSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const texts = Array.from(elements)
            .map((el) => el.textContent?.trim())
            .filter((text) => text && text.length > 10 && !text.includes("Make sure"))
            .slice(0, 5);
          if (texts.length > 0) {
            description = texts.join("; ").substring(0, 500);
            break;
          }
        }
      }

      // 评分
      let rating: string | undefined;
      const ratingSelectors = [
        '[data-hook="average-star-rating"] .a-icon-alt',
        '.a-icon-alt[textContent*="out of"]',
        'span[data-hook="rating-out-of-text"]',
        '[data-testid="reviews-average-rating"]',
        ".a-size-base.a-color-base",
      ];
      for (const selector of ratingSelectors) {
        const ratingEl = document.querySelector(selector);
        if (ratingEl?.textContent) {
          const match = ratingEl.textContent.match(/([\d.]+)/);
          if (match) {
            rating = match[1];
            break;
          }
        }
      }

      // 评论数
      let reviewCount: string | undefined;
      const reviewSelectors = [
        '[data-hook="total-review-count"]',
        'a[href*="#customerReviews"]',
        ".a-size-base.a-color-secondary",
        '[data-testid="reviews-link"]',
        "#acrCustomerReviewText",
      ];
      for (const selector of reviewSelectors) {
        const reviewEl = document.querySelector(selector);
        if (reviewEl?.textContent) {
          const match = reviewEl.textContent.replace(/,/g, "").match(/(\d+)/);
          if (match && parseInt(match[1]) > 0) {
            reviewCount = match[1];
            break;
          }
        }
      }

      return { name, brand, description, price, image, rating, reviewCount, availability };
    });
  }

  /**
   * 检查是否触发反爬虫 - 增强版
   * 检测多种反爬虫标志
   */
  private async checkForAntiBot(): Promise<{ detected: boolean; type: string }> {
    if (!this.page) {
      return { detected: false, type: "" };
    }

    const indicators = [
      { selector: 'form[action*="captcha"]', text: "", type: "captcha_form" },
      { selector: "h1", text: "Robot Check", type: "robot_check" },
      { selector: "h1", text: "Enter the characters you see below", type: "captcha" },
      { selector: "body", text: "To discuss automated access", type: "automated_access" },
      { selector: "title", text: "503", type: "service_unavailable" },
      { selector: ".a-box-inner", text: "unusual traffic", type: "unusual_traffic" },
      { selector: "body", text: "Sorry, we just need to make sure", type: "verification" },
      { selector: 'img[src*="captcha"]', text: "", type: "captcha_image" },
      { selector: "body", text: "Request throttled", type: "throttled" },
      { selector: "body", text: "Amazon.com", type: "page_title" },
      { selector: "#productTitle", text: "", type: "product_page" },
    ];

    for (const { selector, text, type } of indicators) {
      const found = await this.page.evaluate(
        ([sel, txt]: [string, string]) => {
          const el = document.querySelector(sel);
          if (!txt) {
            return !!el;
          }
          return el?.textContent?.includes(txt) || false;
        },
        [selector, text] as [string, string]
      );

      if (found) {
        this.logger.warn(`反爬虫检测: ${type}`);
        return { detected: true, type };
      }
    }

    return { detected: false, type: "" };
  }

  /**
   * 智能重试导航（指数退避）
   */
  private async navigateWithSmartRetry(
    url: string,
    maxRetries = 3
  ): Promise<{ success: boolean; antiBot: boolean }> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const success = await this.navigateWithRetry(url);
        if (!success) {
          continue;
        }

        await this.delay(2000);

        // 检查反爬虫
        const { detected, type } = await this.checkForAntiBot();
        if (detected) {
          const delay = Math.pow(2, i) * 5000; // 5s, 10s, 20s
          this.logger.warn(`检测到反爬虫 (${type})，等待 ${delay}ms 后重试...`);
          await this.delay(delay);

          // 尝试刷新页面
          if (i < maxRetries - 1) {
            continue;
          }
          return { success: false, antiBot: true };
        }

        return { success: true, antiBot: false };
      } catch (error) {
        this.logger.error(`导航失败 (尝试 ${i + 1}/${maxRetries}): ${error}`);
      }
    }

    return { success: false, antiBot: false };
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(
    keyword: string,
    platform: SearchPlatform,
    afterDate: string,
    beforeDate?: string
  ): string {
    const site = platform === "REDDIT" ? "reddit.com" : "x.com";
    let query = `site:${site} "${keyword}" after:${afterDate}`;

    if (beforeDate) {
      query += ` before:${beforeDate}`;
    }

    return query;
  }

  /**
   * 从 URL 提取 ASIN
   */
  private extractAsinFromUrl(url: string): string | null {
    // 匹配 /dp/ASIN 或 /gp/product/ASIN
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) {
      return dpMatch[1].toUpperCase();
    }

    const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (gpMatch) {
      return gpMatch[1].toUpperCase();
    }

    return null;
  }

  // Note: 使用共享的 formatDate 函数，从 ../utils/date 导入

  /**
   * 获取本周开始日期（周一）
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * 获取随机延迟
   */
  private getRandomDelay(): number {
    const range = this.searchConfig.categoryConfig.searchDelayRange ?? [2000, 5000];
    const min = range[0];
    const max = range[1];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 基础爬取方法（接口要求）
   */
  protected async crawl(): Promise<CrawledProduct[]> {
    throw new Error("请使用 crawlCategoryHeat 或 crawlProductsByCategory 方法");
  }
}
