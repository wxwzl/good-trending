/**
 * Google 搜索服务
 * 优先使用 SerpAPI，失败时回退到浏览器爬取
 */

import { getJson } from "serpapi";
import { createLogger, format, transports } from "winston";
import { chromium, Browser, BrowserContext, Page } from "playwright";

// 创建日志记录器
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] [GoogleSearch] ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * 搜索结果
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * 搜索结果响应
 */
export interface SearchResponse {
  success: boolean;
  totalResults: number;
  links: SearchResult[];
  source: "serpapi" | "browser";
  error?: string;
}

/**
 * SerpAPI 配置
 */
interface SerpApiConfig {
  apiKey: string;
  engine?: string;
}

/**
 * Google 搜索服务配置
 */
export interface GoogleSearchServiceConfig {
  serpApi?: SerpApiConfig;
  browser?: {
    headless?: boolean;
    timeout?: number;
    proxy?: string;
  };
  // 强制使用浏览器（用于测试）
  forceBrowser?: boolean;
}

/**
 * Google 搜索服务
 * 优先使用 SerpAPI，失败时回退到浏览器
 */
export class GoogleSearchService {
  private config: GoogleSearchServiceConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private serpApiQuotaExhausted = false;

  constructor(config: GoogleSearchServiceConfig = {}) {
    this.config = {
      serpApi: {
        apiKey: process.env.SERPAPI_KEY || "",
        engine: "google",
      },
      browser: {
        headless: true,
        timeout: 30000,
      },
      forceBrowser: false,
      ...config,
    };
  }

  /**
   * 执行搜索
   * 优先使用 SerpAPI，失败时回退到浏览器
   * @param query 搜索查询
   * @param externalPage 可选的外部页面实例（用于复用浏览器）
   */
  async search(query: string, externalPage?: Page): Promise<SearchResponse> {
    // 1. 尝试使用 SerpAPI（如果有 API key 且额度未满）
    if (!this.config.forceBrowser && !this.serpApiQuotaExhausted && this.config.serpApi?.apiKey) {
      const serpResult = await this.searchWithSerpApi(query);
      if (serpResult.success) {
        return serpResult;
      }

      // 如果是额度问题，标记为已用完
      if (serpResult.error?.includes("quota") || serpResult.error?.includes("rate limit")) {
        this.serpApiQuotaExhausted = true;
        logger.warn("SerpAPI 额度已用完，切换到浏览器模式");
      }
    }

    // 2. 回退到浏览器爬取
    logger.info("使用浏览器爬取搜索结果");
    return this.searchWithBrowser(query, externalPage);
  }

  /**
   * 使用 SerpAPI 搜索
   */
  private async searchWithSerpApi(query: string): Promise<SearchResponse> {
    try {
      logger.info(`使用 SerpAPI 搜索: ${query}`);

      const response: any = await getJson({
        engine: this.config.serpApi?.engine || "google",
        q: query,
        api_key: this.config.serpApi?.apiKey,
        num: 30, // 返回 30 条结果
      });

      // 检查错误
      if (response.error) {
        throw new Error(response.error);
      }

      // 提取结果
      const organicResults = response.organic_results || [];
      const links: SearchResult[] = organicResults.map((r: any) => ({
        title: r.title || "",
        url: r.link || "",
        snippet: r.snippet || "",
      }));

      logger.info(`SerpAPI 返回 ${links.length} 个结果`);

      return {
        success: true,
        totalResults: response.search_information?.total_results || links.length,
        links,
        source: "serpapi",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`SerpAPI 搜索失败: ${errorMsg}`);

      return {
        success: false,
        totalResults: 0,
        links: [],
        source: "serpapi",
        error: errorMsg,
      };
    }
  }

  /**
   * 使用浏览器搜索（备用方案）
   * @param query 搜索查询
   * @param externalPage 可选的外部页面实例
   */
  private async searchWithBrowser(query: string, externalPage?: Page): Promise<SearchResponse> {
    try {
      logger.info(`使用浏览器搜索: ${query}`);

      let page: Page;

      if (externalPage) {
        // 使用外部传入的页面实例
        page = externalPage;
        logger.info("使用外部页面实例进行搜索");
      } else {
        // 初始化自己的浏览器
        await this.initBrowser();
        if (!this.page) {
          throw new Error("浏览器页面未初始化");
        }
        page = this.page;
      }

      // 模拟真实用户行为：先访问 Google 首页，再输入搜索
      logger.info("模拟用户搜索行为...");

      // 1. 先访问 Google 首页
      logger.info("访问 Google 首页");
      const homeResponse = await page.goto("https://www.google.com", {
        waitUntil: "networkidle",
        timeout: this.config.browser?.timeout || 30000,
      });

      if (!homeResponse || homeResponse.status() !== 200) {
        throw new Error("无法访问 Google 首页");
      }

      await page.waitForTimeout(2000);

      // 2. 找到搜索框并输入查询
      logger.info(`在搜索框输入: ${query}`);
      const searchInput = await page.$('textarea[name="q"], input[name="q"]');
      if (!searchInput) {
        throw new Error("找不到 Google 搜索框");
      }

      await searchInput.click();
      await searchInput.fill(query);
      await page.waitForTimeout(500);

      // 3. 按回车搜索（模拟用户行为）
      logger.info("执行搜索...");
      await searchInput.press("Enter");

      // 4. 等待搜索结果页面加载
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(3000);

      // 检查当前URL
      const currentUrl = page.url();
      logger.info(`当前页面URL: ${currentUrl}`);

      if (currentUrl.includes("google.com/search")) {
        logger.info("成功导航到 Google 搜索结果页面");
      } else {
        logger.warn(`警告: 当前页面不是搜索结果页 (${currentUrl})`);
      }

      // 提取搜索结果
      const result = await page.evaluate(() => {
        // 搜索结果总数
        let totalResults = 0;
        const statsEl = document.querySelector("#result-stats");
        if (statsEl) {
          const statsText = statsEl.textContent || "";
          const match = statsText.match(/([\d,]+)\s*results?/i);
          if (match) {
            totalResults = parseInt(match[1].replace(/,/g, ""), 10);
          }
        }

        // 提取结果链接 - 多种选择器
        const links: Array<{ title: string; url: string; snippet: string }> = [];
        const selectors = [
          'div[data-ved] a[jsname="UWckNb"]',
          'div.g a[href^="http"]',
          'div.yuRUbf > a',
          'a[ping][href^="http"]',
          '#search a[href^="http"]',
        ];

        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));

          for (const linkEl of elements) {
            const url = linkEl.getAttribute("href") || "";
            let titleEl = linkEl.querySelector("h3");
            if (!titleEl) {
              const parent = linkEl.closest('div[data-ved], div.g, div.MjjYud');
              if (parent) {
                titleEl = parent.querySelector("h3");
              }
            }
            const title = titleEl?.textContent || linkEl.textContent || "";

            let snippet = "";
            const parent = linkEl.closest('div[data-ved], div.g, div.MjjYud');
            if (parent) {
              const snippetEl = parent.querySelector('div.VwiC3b, span.aCOpRe, div.s3v94d');
              snippet = snippetEl?.textContent?.trim() || "";
            }

            if (
              url &&
              title &&
              url.startsWith("http") &&
              !url.includes("google.com") &&
              !url.includes("webcache.googleusercontent.com")
            ) {
              links.push({
                title: title.trim().substring(0, 200),
                url,
                snippet: snippet.substring(0, 300),
              });
            }
          }

          if (links.length > 0) break;
        }

        // 去重
        const uniqueLinks = links.filter(
          (link, index, self) => index === self.findIndex((l) => l.url === link.url)
        );

        return { totalResults, links: uniqueLinks };
      });

      logger.info(`浏览器搜索返回 ${result.links.length} 个结果`);

      return {
        success: true,
        totalResults: result.totalResults,
        links: result.links,
        source: "browser",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`浏览器搜索失败: ${errorMsg}`);

      return {
        success: false,
        totalResults: 0,
        links: [],
        source: "browser",
        error: errorMsg,
      };
    }
  }

  /**
   * 初始化浏览器
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) return;

    logger.info("初始化浏览器...");

    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: this.config.browser?.headless ?? true,
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
      ],
    };

    if (this.config.browser?.proxy) {
      launchOptions.proxy = { server: this.config.browser.proxy };
    }

    this.browser = await chromium.launch(launchOptions);
    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    // 注入脚本隐藏自动化特征
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      (window as any).chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    });

    this.page = await this.context.newPage();
    logger.info("浏览器初始化完成");
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
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
    logger.info("浏览器已关闭");
  }

  /**
   * 重置 SerpAPI 额度状态（例如每月重置）
   */
  resetSerpApiQuota(): void {
    this.serpApiQuotaExhausted = false;
    logger.info("SerpAPI 额度状态已重置");
  }

  /**
   * 获取当前使用的搜索源
   */
  getCurrentSource(): "serpapi" | "browser" {
    return this.serpApiQuotaExhausted ? "browser" : "serpapi";
  }
}
