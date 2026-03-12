/**
 * Google 搜索服务
 * 优先使用 SerpAPI，失败时回退到浏览器爬取
 *
 * 增强反爬虫检测：
 * 1. 使用 playwright-extra 增强浏览器
 * 2. 增加随机鼠标移动和延迟
 * 3. 增强浏览器指纹伪装
 */

import { getJson } from "serpapi";
import { createLoggerInstance } from "@good-trending/shared";
import { chromium, Browser, BrowserContext, Page } from "playwright";

// 创建日志记录器
const logger = createLoggerInstance("google-search-service");

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
 * 增强的 Stealth 注入脚本
 * 隐藏自动化特征
 */
const STEALTH_SCRIPT = () => {
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
        MIPSEL: "mipsel",
        X86_32: "x86-32",
        X86_64: "x86-64",
      },
      PlatformNaclArch: {
        ARM: "arm",
        MIPS: "mips",
        MIPS64: "mips64",
        MIPS64EL: "mips64el",
        MIPSEL: "mipsel",
        MIPS_EL: "mipsel",
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
        0: { type: "application/pdf", suffixes: "pdf", description: "" },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer2",
        length: 1,
        name: "Chrome PDF Viewer",
      },
      {
        0: { type: "application/x-nacl", suffixes: "", description: "" },
        1: { type: "application/x-pnacl", suffixes: "", description: "" },
        description: "Native Client module",
        filename: "internal-nacl-plugin",
        length: 2,
        name: "Native Client",
      },
    ],
    configurable: true,
  });

  // 模拟语言
  Object.defineProperty(navigator, "languages", {
    get: () => ["en-US", "en", "zh-CN", "zh"],
    configurable: true,
  });

  // 覆盖 permissions API
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = async (parameters: PermissionDescriptor) => {
    if (parameters.name === "notifications") {
      return { state: Notification.permission } as PermissionStatus;
    }
    return originalQuery.call(window.navigator.permissions, parameters);
  };

  // 覆盖 Notification.permission
  Object.defineProperty(Notification, "permission", {
    get: () => "default",
    configurable: true,
  });

  // 隐藏 Playwright 特有的属性
  delete (window as any).__playwright;
  delete (window as any).__pw_manual;
  delete (window as any).__PW_inspect;

  // 覆盖 console.debug (某些检测会检查)
  const originalDebug = console.debug;
  console.debug = (...args: any[]) => {
    if (args.length > 0 && typeof args[0] === "string" && args[0].includes("playwright")) {
      return;
    }
    originalDebug.apply(console, args);
  };
};

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
        proxy: process.env.BROWSER_PROXY,
      },
      forceBrowser: false,
      ...config,
    };
  }

  /**
   * 获取随机延迟时间（毫秒）
   * 用于模拟人类行为
   */
  private getRandomDelay(min = 1000, max = 3000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 模拟人类鼠标移动
   */
  private async simulateHumanMouseMovements(page: Page): Promise<void> {
    try {
      const viewport = page.viewportSize();
      if (!viewport) {
        return;
      }

      // 随机移动几次鼠标
      const moves = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < moves; i++) {
        const x = Math.floor(Math.random() * viewport.width);
        const y = Math.floor(Math.random() * viewport.height);
        await page.mouse.move(x, y, { steps: 10 });
        await page.waitForTimeout(Math.floor(Math.random() * 200) + 500);
      }
    } catch {
      // 忽略鼠标移动错误
    }
  }

  /**
   * 模拟人类滚动
   */
  private async simulateHumanScroll(page: Page): Promise<void> {
    try {
      const scrolls = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < scrolls; i++) {
        await page.mouse.wheel(0, Math.floor(Math.random() * 1000) + 500);
        await page.waitForTimeout(Math.floor(Math.random() * 500) + 1000);
      }
    } catch {
      // 忽略滚动错误
    }
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
   * 增强反检测措施
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

      // 随机延迟，模拟人类思考时间 (10-20秒)
      const initialDelay = this.getRandomDelay(10000, 20000);
      logger.info(`初始延迟 ${initialDelay}ms 模拟人类行为`);
      await page.waitForTimeout(initialDelay);

      // 模拟鼠标移动
      await this.simulateHumanMouseMovements(page);

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

      // 随机延迟 (5-10秒)
      await page.waitForTimeout(this.getRandomDelay(5000, 10000));

      // 模拟滚动
      await this.simulateHumanScroll(page);

      // 2. 找到搜索框并输入查询
      logger.info(`在搜索框输入: ${query}`);
      const searchInput = await page.$('textarea[name="q"], input[name="q"]');
      if (!searchInput) {
        throw new Error("找不到 Google 搜索框");
      }

      // 模拟点击前先移动鼠标
      const box = await searchInput.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }

      await searchInput.click();

      // 模拟人类输入（逐字输入，带随机延迟 100-300ms）
      for (const char of query) {
        await searchInput.type(char, { delay: Math.floor(Math.random() * 800) + 500 });
      }

      await page.waitForTimeout(this.getRandomDelay(1000, 3000));

      // 3. 按回车搜索（模拟用户行为）
      logger.info("执行搜索...");
      await searchInput.press("Enter");

      // 4. 等待搜索结果页面加载
      await page.waitForLoadState("networkidle", { timeout: 30000 });

      // 随机延迟等待结果渲染 (10-20秒)
      await page.waitForTimeout(this.getRandomDelay(10000, 20000));

      // 模拟查看搜索结果的行为
      await this.simulateHumanScroll(page);

      // 检查当前URL
      const currentUrl = page.url();
      logger.info(`当前页面URL: ${currentUrl}`);

      if (currentUrl.includes("google.com/search")) {
        logger.info("成功导航到 Google 搜索结果页面");
      } else if (currentUrl.includes("/sorry") || currentUrl.includes("captcha")) {
        throw new Error("触发 Google 反爬虫验证，请稍后重试或使用代理");
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
          "div.yuRUbf > a",
          'a[ping][href^="http"]',
          '#search a[href^="http"]',
        ];

        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));

          for (const linkEl of elements) {
            const url = linkEl.getAttribute("href") || "";
            let titleEl = linkEl.querySelector("h3");
            if (!titleEl) {
              const parent = linkEl.closest("div[data-ved], div.g, div.MjjYud");
              if (parent) {
                titleEl = parent.querySelector("h3");
              }
            }
            const title = titleEl?.textContent || linkEl.textContent || "";

            let snippet = "";
            const parent = linkEl.closest("div[data-ved], div.g, div.MjjYud");
            if (parent) {
              const snippetEl = parent.querySelector("div.VwiC3b, span.aCOpRe, div.s3v94d");
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

          if (links.length > 0) {
            break;
          }
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
   * 增强反检测措施
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    logger.info("初始化浏览器（增强反检测模式）...");

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
        "--disable-blink-features",
        "--disable-blink-features=AutomationControlled",
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
        "--force-webrtc-ip-handling-policy=default_public_interface_only",
      ],
    };

    if (this.config.browser?.proxy) {
      launchOptions.proxy = { server: this.config.browser.proxy };
    }

    this.browser = await chromium.launch(launchOptions);

    // 生成随机视口大小（在常见范围内）
    const width = 1920 + Math.floor(Math.random() * 100) - 50;
    const height = 1080 + Math.floor(Math.random() * 100) - 50;

    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width, height },
      locale: "en-US",
      timezoneId: "America/New_York",
      permissions: [],
      // 隐藏自动化特征
      bypassCSP: false,
      javaScriptEnabled: true,
    });

    // 注入增强的 Stealth 脚本
    await this.context.addInitScript(STEALTH_SCRIPT);

    this.page = await this.context.newPage();

    // 设置额外的请求头
    await this.page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      "Upgrade-Insecure-Requests": "1",
    });

    logger.info("浏览器初始化完成（增强反检测）");
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
