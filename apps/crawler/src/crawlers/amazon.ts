import { createLogger, format, transports, Logger } from "winston";
import { BaseCrawler } from "../base";
import { ProductData } from "../manager";

/**
 * 亚马逊爬虫配置
 */
export interface AmazonCrawlerConfig {
  /** 地区 (如: com, co.uk, co.jp) */
  region?: string;
  /** 分类 URL */
  categoryUrl?: string;
  /** 最大商品数 */
  maxProducts?: number;
}

/**
 * 亚马逊爬虫
 * 用于抓取 Amazon Best Sellers 等数据
 */
export class AmazonCrawler extends BaseCrawler<ProductData> {
  protected logger: Logger;
  private amazonConfig: Required<AmazonCrawlerConfig>;
  private baseUrl: string;

  constructor(crawlerConfig = {}, amazonConfig: AmazonCrawlerConfig = {}) {
    super(crawlerConfig);
    this.amazonConfig = {
      region: amazonConfig.region ?? "com",
      categoryUrl: amazonConfig.categoryUrl ?? "/Best-Sellers/zgbs",
      maxProducts: amazonConfig.maxProducts ?? 50,
    };

    this.baseUrl = `https://www.amazon.${this.amazonConfig.region}`;

    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level.toUpperCase()}] [AmazonCrawler] ${message}`;
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
    return "AmazonCrawler";
  }

  getSourceType(): string {
    return "AMAZON";
  }

  protected async crawl(): Promise<ProductData[]> {
    const products: ProductData[] = [];

    this.logger.info(`Starting Amazon crawl for region: ${this.amazonConfig.region}`);

    try {
      // 访问 Best Sellers 页面
      const bestSellersUrl = `${this.baseUrl}${this.amazonConfig.categoryUrl}`;
      this.logger.info(`Navigating to: ${bestSellersUrl}`);

      const success = await this.navigateWithRetry(bestSellersUrl);

      if (!success) {
        this.logger.error("Failed to navigate to Best Sellers page");
        return products;
      }

      // 等待页面加载
      await this.delay(2000);

      // 获取商品列表
      const productLinks = await this.extractProductLinks();

      this.logger.info(`Found ${productLinks.length} product links`);

      // 遍历商品详情
      for (let i = 0; i < Math.min(productLinks.length, this.amazonConfig.maxProducts); i++) {
        const link = productLinks[i];

        try {
          await this.delay();
          const productData = await this.extractProductDetails(link);
          if (productData) {
            products.push(productData);
            this.logger.debug(`Extracted product: ${productData.name}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to extract product ${link}: ${error}`);
        }
      }

      this.logger.info(`Extracted ${products.length} products from Amazon`);
    } catch (error) {
      this.logger.error(`Amazon crawl failed: ${error}`);
    }

    return products;
  }

  /**
   * 提取商品链接
   */
  private async extractProductLinks(): Promise<string[]> {
    if (!this.page) {
      return [];
    }

    try {
      // 亚马逊 Best Sellers 页面的商品链接选择器
      const selectors = [
        'a.a-link-normal[href*="/dp/"]',
        '#gridItemRoot a[href*="/dp/"]',
        '.p13n-sc-truncated a[href*="/dp/"]',
      ];

      for (const selector of selectors) {
        const links = await this.page.$$eval(selector, (elements) =>
          elements.map((el) => el.getAttribute("href")).filter(Boolean)
        );

        if (links.length > 0) {
          // 去重并补全 URL
          const uniqueLinks = [...new Set(links as string[])];
          return uniqueLinks.map((link) => {
            if (link?.startsWith("/")) {
              return `${this.baseUrl}${link}`;
            }
            return link;
          }) as string[];
        }
      }

      return [];
    } catch (error) {
      this.logger.error(`Failed to extract product links: ${error}`);
      return [];
    }
  }

  /**
   * 提取商品详情
   */
  private async extractProductDetails(url: string): Promise<ProductData | null> {
    if (!this.page) {
      return null;
    }

    try {
      const success = await this.navigateWithRetry(url);
      if (!success) {
        return null;
      }

      await this.delay(500);

      // 提取商品信息
      const productInfo = await this.page.evaluate(() => {
        // 商品名称
        const nameEl = document.querySelector("#productTitle");
        const name = nameEl?.textContent?.trim() ?? "";

        // 商品描述
        const descEl = document.querySelector("#productDescription p");
        const description = descEl?.textContent?.trim() ?? undefined;

        // 图片
        const imgEl = document.querySelector("#landingImage, #imgBlkFront");
        const image = imgEl?.getAttribute("src") ?? undefined;

        // 价格
        const priceEl = document.querySelector(
          ".a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice"
        );
        const priceText = priceEl?.textContent?.trim() ?? "";
        const priceMatch = priceText.match(/[\d,.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : undefined;

        // ASIN
        const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]+)/);
        const asin = asinMatch ? asinMatch[1] : "";

        return {
          name,
          description,
          image,
          price,
          sourceId: asin,
        };
      });

      if (!productInfo.name || !productInfo.sourceId) {
        return null;
      }

      return {
        name: productInfo.name,
        description: productInfo.description,
        image: productInfo.image,
        price: productInfo.price,
        currency: "USD",
        sourceUrl: url,
        sourceId: productInfo.sourceId,
        sourceType: "AMAZON",
      };
    } catch (error) {
      this.logger.error(`Failed to extract product details: ${error}`);
      return null;
    }
  }
}
