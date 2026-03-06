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

  /**
   * 将亚马逊分类映射到系统分类
   */
  private mapCategoriesToTopics(categories: string[]): string[] {
    const topics: string[] = [];

    // 分类映射表（亚马逊分类关键字 -> 系统分类 slug）
    const categoryMappings: Record<string, string[]> = {
      // Tech Gadgets
      Electronics: ["tech-gadgets"],
      Computers: ["tech-gadgets"],
      "Cell Phones": ["tech-gadgets"],
      "Smart Home": ["tech-gadgets", "home-living"],
      "Wearable Technology": ["tech-gadgets"],
      Headphones: ["tech-gadgets"],
      "Portable Audio": ["tech-gadgets"],
      Camera: ["tech-gadgets"],
      Photography: ["tech-gadgets"],
      Accessories: ["tech-gadgets"],

      // Home & Living
      "Home & Kitchen": ["home-living"],
      Kitchen: ["home-living"],
      Furniture: ["home-living"],
      "Home Décor": ["home-living"],
      Bedding: ["home-living"],
      Bath: ["home-living"],
      Appliances: ["home-living"],

      // Fashion
      Clothing: ["fashion"],
      Shoes: ["fashion"],
      Jewelry: ["fashion"],
      Watches: ["fashion"],
      Handbags: ["fashion"],

      // Beauty & Personal Care
      Beauty: ["beauty-personal-care"],
      "Personal Care": ["beauty-personal-care"],
      "Skin Care": ["beauty-personal-care"],
      Makeup: ["beauty-personal-care"],
      Hair: ["beauty-personal-care"],
      Fragrance: ["beauty-personal-care"],

      // Sports & Outdoors
      Sports: ["sports-outdoors"],
      "Outdoor Recreation": ["sports-outdoors"],
      Fitness: ["sports-outdoors", "health-wellness"],
      Exercise: ["sports-outdoors", "health-wellness"],
      Camping: ["sports-outdoors"],
      Hiking: ["sports-outdoors"],

      // Health & Wellness
      Health: ["health-wellness"],
      "Household Supplies": ["health-wellness"],
      "Baby Care": ["health-wellness"],
      Wellness: ["health-wellness"],

      // Toys & Games
      Toys: ["toys-games"],
      Games: ["toys-games"],
      "Video Games": ["toys-games", "tech-gadgets"],
      Puzzles: ["toys-games"],
    };

    for (const category of categories) {
      for (const [keyword, mappedTopics] of Object.entries(categoryMappings)) {
        if (category.toLowerCase().includes(keyword.toLowerCase())) {
          topics.push(...mappedTopics);
        }
      }
    }

    // 去重并返回
    return [...new Set(topics)];
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

        // 提取分类（面包屑导航）
        const breadcrumbs: string[] = [];
        const breadcrumbSelectors = [
          "#wayfinding-breadcrumbs_feature_div ul li a",
          "#wayfinding-breadcrumbs_container ul li a",
          "[data-feature-name='wayfinding-breadcrumbs'] a",
          "#breadcrumb-back-link",
        ];
        for (const selector of breadcrumbSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach((el) => {
              const text = el.textContent?.trim();
              if (text && text.length > 0 && text !== "Back to results") {
                breadcrumbs.push(text);
              }
            });
            if (breadcrumbs.length > 0) {
              break;
            }
          }
        }

        return {
          name,
          description,
          image,
          price,
          sourceId: asin,
          breadcrumbs,
        };
      });

      if (!productInfo.name || !productInfo.sourceId) {
        return null;
      }

      // 将亚马逊分类映射到系统分类
      const topics = this.mapCategoriesToTopics(productInfo.breadcrumbs);

      return {
        name: productInfo.name,
        description: productInfo.description,
        image: productInfo.image,
        price: productInfo.price,
        currency: "USD",
        sourceUrl: url,
        sourceId: productInfo.sourceId,
        sourceType: "AMAZON",
        topics,
      };
    } catch (error) {
      this.logger.error(`Failed to extract product details: ${error}`);
      return null;
    }
  }
}
