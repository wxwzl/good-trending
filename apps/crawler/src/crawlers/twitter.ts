import { createLogger, format, transports, Logger } from "winston";
import { BaseCrawler } from "../base";
import { ProductData } from "../manager";

/**
 * X 平台爬虫配置
 */
export interface TwitterCrawlerConfig {
  /** 用户名 */
  username?: string;
  /** 密码 */
  password?: string;
  /** 搜索关键词 */
  keywords?: string[];
  /** 最大推文数 */
  maxTweets?: number;
}

/**
 * X 平台爬虫
 * 用于抓取 X (Twitter) 平台的商品相关数据
 */
export class TwitterCrawler extends BaseCrawler<ProductData> {
  protected logger: Logger;
  private twitterConfig: Required<TwitterCrawlerConfig>;

  constructor(crawlerConfig = {}, twitterConfig: TwitterCrawlerConfig = {}) {
    super(crawlerConfig);
    this.twitterConfig = {
      username: twitterConfig.username ?? "",
      password: twitterConfig.password ?? "",
      keywords: twitterConfig.keywords ?? ["trending products", "best sellers"],
      maxTweets: twitterConfig.maxTweets ?? 100,
    };

    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level.toUpperCase()}] [TwitterCrawler] ${message}`;
        })
      ),
      transports: [
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
      ],
    });
  }

  getName(): string {
    return "TwitterCrawler";
  }

  getSourceType(): string {
    return "X_PLATFORM";
  }

  protected async crawl(): Promise<ProductData[]> {
    const products: ProductData[] = [];

    // 由于 X 平台需要登录且有反爬虫机制，这里提供框架实现
    // 实际使用时需要配置登录凭据和处理验证码

    this.logger.info("Starting X Platform crawl...");
    this.logger.warn("X Platform crawler requires authentication. Please configure credentials.");

    // 示例：搜索关键词获取商品链接
    for (const keyword of this.twitterConfig.keywords) {
      this.logger.info(`Searching for keyword: ${keyword}`);

      // 由于 X 平台限制，这里只是框架实现
      // 实际实现需要：
      // 1. 登录 X 平台
      // 2. 搜索关键词
      // 3. 解析推文内容
      // 4. 提取商品链接
      // 5. 保存数据

      await this.delay();

      // 模拟数据（实际应从页面抓取）
      const mockProducts = this.generateMockProducts(keyword, 5);
      products.push(...mockProducts);

      if (products.length >= this.twitterConfig.maxTweets) {
        break;
      }
    }

    this.logger.info(`Found ${products.length} products from X Platform`);

    return products;
  }

  /**
   * 登录 X 平台
   */
  private async login(): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      await this.page.goto("https://twitter.com/i/flow/login");

      // 等待登录表单加载
      await this.page.waitForSelector('input[autocomplete="username"]', {
        timeout: 10000,
      });

      // 输入用户名
      await this.page.fill('input[autocomplete="username"]', this.twitterConfig.username);

      // 点击下一步
      await this.page.click('button:has-text("Next")');

      // 输入密码
      await this.page.waitForSelector('input[name="password"]');
      await this.page.fill('input[name="password"]', this.twitterConfig.password);

      // 点击登录
      await this.page.click('button[data-testid="LoginForm_Login_Button"]');

      // 等待登录成功
      await this.page.waitForURL("https://twitter.com/home", {
        timeout: 30000,
      });

      this.logger.info("Successfully logged in to X Platform");
      return true;
    } catch (error) {
      this.logger.error(`Login failed: ${error}`);
      return false;
    }
  }

  /**
   * 搜索推文
   */
  private async searchTweets(query: string): Promise<void> {
    if (!this.page) {
      return;
    }

    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query`;
    await this.navigateWithRetry(searchUrl);
  }

  /**
   * 生成模拟数据（仅用于测试）
   */
  private generateMockProducts(keyword: string, count: number): ProductData[] {
    const products: ProductData[] = [];

    for (let i = 0; i < count; i++) {
      products.push({
        name: `Product from X: ${keyword} #${i + 1}`,
        description: `Trending product found via keyword: ${keyword}`,
        sourceUrl: `https://twitter.com/mock/status/${Date.now()}_${i}`,
        sourceId: `twitter_${Date.now()}_${i}`,
        sourceType: "X_PLATFORM",
      });
    }

    return products;
  }
}
