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
import type { IGoogleSearch } from "../../../domain/interfaces/index.js";

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
export class GoogleSearchService implements IGoogleSearch {
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
    // 使用正态分布让延迟更自然
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 4;
    const value = Math.floor(this.normalDistribution(mean, stdDev));
    // 确保在范围内
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 正态分布随机数生成
   * 使用 Box-Muller 变换
   */
  private normalDistribution(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * 模拟人类鼠标移动 - 增强随机性
   */
  private async simulateHumanMouseMovements(page: Page): Promise<void> {
    try {
      const viewport = page.viewportSize();
      if (!viewport) {
        return;
      }

      // 随机移动次数 (3-8次)
      const moves = Math.floor(Math.random() * 6) + 3;

      for (let i = 0; i < moves; i++) {
        // 随机位置，避开边缘
        const x = Math.floor(Math.random() * (viewport.width - 300)) + 150;
        const y = Math.floor(Math.random() * (viewport.height - 300)) + 150;

        // 随机移动速度 (steps 5-25)
        const steps = Math.floor(Math.random() * 20) + 5;
        await page.mouse.move(x, y, { steps });

        // 随机停留时间 (200-1500ms)
        const pauseTime = Math.floor(Math.random() * 1300) + 200;
        await page.waitForTimeout(pauseTime);
      }

      // 偶尔点击一下页面空白处
      if (Math.random() > 0.7) {
        const clickX = Math.floor(Math.random() * (viewport.width - 400)) + 200;
        const clickY = Math.floor(Math.random() * (viewport.height - 400)) + 200;
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(Math.floor(Math.random() * 500) + 300);
      }
    } catch {
      // 忽略错误
    }
  }

  /**
   * 模拟人类滚动 - 增强随机性
   */
  private async simulateHumanScroll(page: Page): Promise<void> {
    try {
      // 随机滚动次数 (2-6次)
      const scrolls = Math.floor(Math.random() * 5) + 2;

      for (let i = 0; i < scrolls; i++) {
        // 随机滚动方向和距离
        const direction = Math.random() > 0.3 ? 1 : -1; // 70% 向下，30% 向上
        const scrollDistance = Math.floor(Math.random() * 1200) + 300;

        await page.mouse.wheel(0, direction * scrollDistance);

        // 滚动后随机停留 (500-2500ms)
        const pauseTime = Math.floor(Math.random() * 2000) + 500;
        await page.waitForTimeout(pauseTime);
      }

      // 偶尔回滚一点（阅读模式）
      if (Math.random() > 0.6) {
        await page.mouse.wheel(0, -Math.floor(Math.random() * 400) - 100);
        await page.waitForTimeout(Math.floor(Math.random() * 1000) + 500);
      }
    } catch {
      // 忽略错误
    }
  }

  /**
   * 模拟随机浏览行为
   * 在搜索前做一些随机的事情
   */
  private async simulateRandomBrowsing(page: Page): Promise<void> {
    try {
      const actions = [
        async () => {
          // 随机滚动
          await this.simulateHumanScroll(page);
        },
        async () => {
          // 随机鼠标移动
          await this.simulateHumanMouseMovements(page);
        },
        async () => {
          // 点击页面空白处
          const viewport = page.viewportSize();
          if (viewport) {
            const x = Math.floor(Math.random() * (viewport.width - 400)) + 200;
            const y = Math.floor(Math.random() * (viewport.height - 400)) + 200;
            await page.mouse.click(x, y);
          }
        },
        async () => {
          // 什么都不做，只是等待
          await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000);
        },
      ];

      // 随机选择 1-3 个动作执行
      const numActions = Math.floor(Math.random() * 3) + 1;
      const shuffled = actions.sort(() => Math.random() - 0.5);

      for (let i = 0; i < numActions; i++) {
        await shuffled[i]();
        await page.waitForTimeout(Math.floor(Math.random() * 1500) + 500);
      }
    } catch {
      // 忽略错误
    }
  }

  /**
   * 模拟人类输入行为 - 高度随机化
   */
  private async simulateHumanTyping(page: Page, selector: string, text: string): Promise<void> {
    try {
      // 随机滚动到元素
      await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, selector);
      await page.waitForTimeout(Math.floor(Math.random() * 800) + 400);

      const element = await page.$(selector);
      if (!element) {
        return;
      }

      // 随机移动到元素（带偏移）
      const box = await element.boundingBox();
      if (box) {
        const offsetX = Math.floor(Math.random() * 30) - 15;
        const offsetY = Math.floor(Math.random() * 20) - 10;
        const steps = Math.floor(Math.random() * 10) + 5;
        await page.mouse.move(box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY, {
          steps,
        });
        await page.waitForTimeout(Math.floor(Math.random() * 400) + 200);
        await page.mouse.click(box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY);
        await page.waitForTimeout(Math.floor(Math.random() * 500) + 300);
      }

      // 随机决定是否全选删除（50%概率）
      if (Math.random() > 0.5) {
        await page.keyboard.press("Control+a");
        await page.waitForTimeout(Math.floor(Math.random() * 300) + 100);
        await page.keyboard.press("Delete");
        await page.waitForTimeout(Math.floor(Math.random() * 400) + 200);
      }

      // 逐字输入，带高度随机延迟
      for (let i = 0; i < text.length; i++) {
        // 基础延迟 50-400ms
        const baseDelay = Math.floor(Math.random() * 350) + 50;

        // 偶尔停顿（10%概率，模拟思考）
        if (Math.random() > 0.9) {
          await page.waitForTimeout(Math.floor(Math.random() * 800) + 400);
        }

        // 偶尔打错字并删除（5%概率，更真实）
        if (Math.random() > 0.95 && i > 0) {
          const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
          await page.keyboard.type(wrongChar, { delay: baseDelay });
          await page.waitForTimeout(Math.floor(Math.random() * 300) + 200);
          await page.keyboard.press("Backspace");
          await page.waitForTimeout(Math.floor(Math.random() * 300) + 200);
        }

        await page.keyboard.type(text[i], { delay: baseDelay });
      }

      // 输入后随机停顿 (300-1500ms)
      await page.waitForTimeout(Math.floor(Math.random() * 1200) + 300);

      // 偶尔在输入后移动鼠标
      if (Math.random() > 0.7) {
        await this.simulateHumanMouseMovements(page);
      }
    } catch {
      // 失败时使用普通输入
      await page.fill(selector, text);
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

      // 随机延迟，模拟人类思考时间 (8-25秒) - 使用正态分布更自然
      const initialDelay = this.getRandomDelay(8000, 25000);
      logger.info(`初始延迟 ${initialDelay}ms 模拟人类行为`);
      await page.waitForTimeout(initialDelay);

      // 模拟鼠标移动（多次，更随机）
      await this.simulateHumanMouseMovements(page);

      // 偶尔第二次鼠标移动（30%概率）
      if (Math.random() > 0.7) {
        await page.waitForTimeout(this.getRandomDelay(500, 2000));
        await this.simulateHumanMouseMovements(page);
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

      // 随机延迟 (5-15秒) - 更宽的随机范围
      await page.waitForTimeout(this.getRandomDelay(5000, 15000));

      // 模拟随机浏览行为（浏览页面后再搜索）
      await this.simulateRandomBrowsing(page);

      // 再次随机移动鼠标
      await this.simulateHumanMouseMovements(page);

      // 2. 找到搜索框并输入查询
      logger.info(`在搜索框输入: ${query}`);

      // 使用增强的人类输入模拟
      await this.simulateHumanTyping(page, 'textarea[name="q"], input[name="q"]', query);

      // 随机决定是否停顿后再搜索 (70%概率)
      if (Math.random() > 0.3) {
        await page.waitForTimeout(this.getRandomDelay(800, 3000));
      }

      // 3. 按回车搜索（模拟用户行为）
      logger.info("执行搜索...");

      // 偶尔点击搜索按钮而不是按回车 (20%概率)
      if (Math.random() > 0.8) {
        const searchButton = await page.$('input[name="btnK"], button[type="submit"]');
        if (searchButton) {
          const box = await searchButton.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
            await page.waitForTimeout(Math.floor(Math.random() * 400) + 200);
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          } else {
            await page.keyboard.press("Enter");
          }
        } else {
          await page.keyboard.press("Enter");
        }
      } else {
        await page.keyboard.press("Enter");
      }

      // 4. 等待搜索结果页面加载
      await page.waitForLoadState("networkidle", { timeout: 30000 });

      // 随机延迟等待结果渲染 (8-25秒)
      await page.waitForTimeout(this.getRandomDelay(8000, 25000));

      // 模拟查看搜索结果的行为（随机化）
      if (Math.random() > 0.2) {
        await this.simulateHumanScroll(page);

        // 偶尔浏览后再次滚动（40%概率）
        if (Math.random() > 0.6) {
          await page.waitForTimeout(this.getRandomDelay(2000, 6000));
          await this.simulateHumanScroll(page);
        }
      }

      // 偶尔在结果页面随机移动鼠标
      if (Math.random() > 0.5) {
        await this.simulateHumanMouseMovements(page);
      }

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
   * User-Agent 列表
   */
  private readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  ];

  /**
   * 获取随机 User-Agent
   */
  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
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
        "--start-maximized",
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
        "--disable-features=UserAgentClientHint",
        "--disable-features=InterestFeedContentSuggestions",
        "--disable-features=TranslateUI",
        "--disable-features=HardwareMediaKeyHandling",
        "--disable-features=MediaSessionService",
      ],
    };

    if (this.config.browser?.proxy) {
      launchOptions.proxy = { server: this.config.browser.proxy };
    }

    this.browser = await chromium.launch(launchOptions);

    // 生成随机视口大小（在常见范围内）
    const width = 1920 + Math.floor(Math.random() * 200) - 100;
    const height = 1080 + Math.floor(Math.random() * 200) - 100;

    // 随机 User-Agent
    const userAgent = this.getRandomUserAgent();
    logger.info(`使用 User-Agent: ${userAgent.substring(0, 50)}...`);

    // 随机时区
    const timezones = ["America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Tokyo"];
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];

    this.context = await this.browser.newContext({
      userAgent,
      viewport: { width, height },
      locale: "en-US",
      timezoneId: timezone,
      permissions: [],
      bypassCSP: false,
      javaScriptEnabled: true,
      hasTouch: false,
      isMobile: false,
      deviceScaleFactor: 1,
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
      "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
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
