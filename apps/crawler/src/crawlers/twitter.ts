import { createLogger, format, transports, Logger } from "winston";
import { BaseCrawler } from "../base";
import { ProductData } from "../manager";

/**
 * X/Twitter 爬虫配置
 */
export interface TwitterCrawlerConfig {
  /** Nitter 实例列表（Twitter 镜像站） */
  nitterInstances?: string[];
  /** 搜索关键词 */
  keywords?: string[];
  /** 最大推文数 */
  maxTweets?: number;
  /** 最小点赞数过滤 */
  minLikes?: number;
  /** 是否提取 Amazon 链接 */
  extractAmazonLinks?: boolean;
  /** 是否提取其他购物链接 */
  extractShoppingLinks?: boolean;
}

/**
 * 推文数据
 */
interface TweetData {
  tweetId: string;
  tweetUrl: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
    followersCount?: number;
  };
  stats: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  productLinks: string[];
  hashtags: string[];
}

/**
 * X/Twitter 爬虫
 * 使用 Nitter 镜像站抓取公开推文数据，无需登录
 */
export class TwitterCrawler extends BaseCrawler<ProductData> {
  protected logger: Logger;
  private twitterConfig: Required<TwitterCrawlerConfig>;
  private currentInstanceIndex: number = 0;
  private tweets: TweetData[] = [];

  // 默认 Nitter 实例列表
  private static readonly DEFAULT_NITTER_INSTANCES = [
    "https://nitter.net",
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
    "https://nitter.cz",
  ];

  // 默认搜索关键词 - 发现热门商品
  private static readonly DEFAULT_KEYWORDS = [
    "amazon finds",
    "amazon must haves",
    "tiktok made me buy it",
    "#amazonfinds",
    "#tiktokmademebuyit",
    "link in bio shop",
    "buy this amazon",
  ];

  constructor(
    crawlerConfig: import("../base").CrawlerConfig = {},
    twitterConfig: TwitterCrawlerConfig = {}
  ) {
    super({
      ...crawlerConfig,
      // Twitter 爬取需要更长的延迟
      requestDelay: crawlerConfig.requestDelay ?? 3000,
      maxRetries: crawlerConfig.maxRetries ?? 5,
    });

    this.twitterConfig = {
      nitterInstances: twitterConfig.nitterInstances ?? TwitterCrawler.DEFAULT_NITTER_INSTANCES,
      keywords: twitterConfig.keywords ?? TwitterCrawler.DEFAULT_KEYWORDS,
      maxTweets: twitterConfig.maxTweets ?? 100,
      minLikes: twitterConfig.minLikes ?? 10,
      extractAmazonLinks: twitterConfig.extractAmazonLinks ?? true,
      extractShoppingLinks: twitterConfig.extractShoppingLinks ?? true,
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

  /**
   * 获取当前 Nitter 实例
   */
  private getCurrentInstance(): string {
    return this.twitterConfig.nitterInstances[this.currentInstanceIndex];
  }

  /**
   * 切换到下一个 Nitter 实例
   */
  private switchInstance(): boolean {
    this.currentInstanceIndex++;
    if (this.currentInstanceIndex >= this.twitterConfig.nitterInstances.length) {
      this.currentInstanceIndex = 0;
      return false; // 所有实例都尝试过了
    }
    this.logger.info(`Switching to Nitter instance: ${this.getCurrentInstance()}`);
    return true;
  }

  /**
   * 主爬取逻辑
   */
  protected async crawl(): Promise<ProductData[]> {
    this.logger.info("Starting X/Twitter crawl via Nitter...");
    this.logger.info(`Keywords: ${this.twitterConfig.keywords.join(", ")}`);
    this.logger.info(`Target tweets: ${this.twitterConfig.maxTweets}`);

    this.tweets = [];

    // 尝试每个关键词
    for (const keyword of this.twitterConfig.keywords) {
      if (this.tweets.length >= this.twitterConfig.maxTweets) {
        break;
      }

      try {
        await this.searchKeyword(keyword);
      } catch (error) {
        this.logger.error(`Failed to search keyword "${keyword}": ${error}`);
      }

      await this.delay(2000); // 关键词间延迟
    }

    this.logger.info(`Found ${this.tweets.length} tweets`);

    // 转换为 ProductData
    const products = this.convertTweetsToProducts(this.tweets);
    this.logger.info(`Extracted ${products.length} products`);

    return products;
  }

  /**
   * 搜索单个关键词
   */
  private async searchKeyword(keyword: string): Promise<void> {
    this.logger.info(`Searching for: "${keyword}"`);

    const encodedKeyword = encodeURIComponent(keyword);
    let page = 1;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 3;

    while (
      this.tweets.length < this.twitterConfig.maxTweets &&
      consecutiveEmptyPages < maxEmptyPages
    ) {
      const searchUrl = `${this.getCurrentInstance()}/search?f=tweets&q=${encodedKeyword}`;

      try {
        const success = await this.navigateWithRetry(searchUrl);
        if (!success) {
          // 尝试切换实例
          if (this.switchInstance()) {
            continue;
          } else {
            break;
          }
        }

        // 等待推文加载
        await this.page?.waitForSelector(".timeline-item", { timeout: 10000 });

        // 提取推文
        const tweets = await this.extractTweetsFromPage();

        if (tweets.length === 0) {
          consecutiveEmptyPages++;
          this.logger.warn(
            `No tweets found on page ${page} (empty count: ${consecutiveEmptyPages})`
          );
        } else {
          consecutiveEmptyPages = 0;
          this.tweets.push(...tweets);
          this.logger.info(
            `Found ${tweets.length} tweets on page ${page} (total: ${this.tweets.length})`
          );
        }

        // 滚动加载更多
        if (this.tweets.length < this.twitterConfig.maxTweets) {
          await this.scrollAndLoadMore();
        }

        page++;
        await this.delay();
      } catch (error) {
        this.logger.error(`Error on page ${page}: ${error}`);
        consecutiveEmptyPages++;

        // 可能是实例不可用，尝试切换
        if (!this.switchInstance()) {
          break;
        }
      }
    }
  }

  /**
   * 滚动加载更多
   */
  private async scrollAndLoadMore(): Promise<void> {
    try {
      // 模拟人类滚动
      await this.page?.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.delay(1500);

      // 提取新加载的推文
      const newTweets = await this.extractTweetsFromPage();
      if (newTweets.length > 0) {
        this.tweets.push(...newTweets);
      }
    } catch (error) {
      this.logger.debug(`Scroll error: ${error}`);
    }
  }

  /**
   * 从页面提取推文
   */
  private async extractTweetsFromPage(): Promise<TweetData[]> {
    if (!this.page) {
      return [];
    }

    return this.page.evaluate((config) => {
      const tweets: TweetData[] = [];
      const tweetElements = document.querySelectorAll(".timeline-item");

      tweetElements.forEach((element) => {
        try {
          // 跳过广告/推荐
          if (element.classList.contains("ad") || element.querySelector(".ad-badge")) {
            return;
          }

          // 提取推文 ID
          const linkElement = element.querySelector(".tweet-link") as HTMLAnchorElement;
          const tweetUrl = linkElement?.href || "";
          const tweetId = tweetUrl.split("/").pop() || "";

          // 提取内容
          const contentElement = element.querySelector(".tweet-content");
          const content = contentElement?.textContent?.trim() || "";

          // 提取作者信息
          const usernameElement = element.querySelector(".username");
          const displayNameElement = element.querySelector(".fullname");
          const username = usernameElement?.textContent?.trim() || "";
          const displayName = displayNameElement?.textContent?.trim() || "";

          // 提取统计数据
          const stats = element.querySelector(".tweet-stats");
          const likes =
            parseInt(
              stats?.querySelector(".icon-heart + div")?.textContent?.replace(/[^0-9]/g, "") || "0"
            ) || 0;
          const retweets =
            parseInt(
              stats?.querySelector(".icon-retweet + div")?.textContent?.replace(/[^0-9]/g, "") ||
                "0"
            ) || 0;
          const replies =
            parseInt(
              stats?.querySelector(".icon-comment + div")?.textContent?.replace(/[^0-9]/g, "") ||
                "0"
            ) || 0;

          // 过滤低互动推文
          if (likes < config.minLikes) {
            return;
          }

          // 提取商品链接
          const productLinks: string[] = [];
          const links = element.querySelectorAll("a");
          links.forEach((link) => {
            const href = link.href;
            if (config.extractAmazonLinks && href.includes("amazon")) {
              productLinks.push(href);
            } else if (
              config.extractShoppingLinks &&
              (href.includes("ebay") || href.includes("shop") || href.includes("store"))
            ) {
              productLinks.push(href);
            }
          });

          // 提取标签
          const hashtags: string[] = [];
          const hashtagElements = element.querySelectorAll(".hashtag");
          hashtagElements.forEach((tag) => {
            const text = tag.textContent?.trim();
            if (text) {
              hashtags.push(text);
            }
          });

          // 提取日期
          const dateElement = element.querySelector(".tweet-date a");
          const createdAt = dateElement?.getAttribute("title") || new Date().toISOString();

          tweets.push({
            tweetId,
            tweetUrl,
            content,
            createdAt,
            author: {
              username,
              displayName,
            },
            stats: {
              likes,
              retweets,
              replies,
            },
            productLinks,
            hashtags,
          });
        } catch (error) {
          console.error("Error extracting tweet:", error);
        }
      });

      return tweets;
    }, this.twitterConfig);
  }

  /**
   * 将推文转换为商品数据
   */
  private convertTweetsToProducts(tweets: TweetData[]): ProductData[] {
    const products: ProductData[] = [];
    const seenUrls = new Set<string>();

    for (const tweet of tweets) {
      // 为每个商品链接创建一个产品
      for (const link of tweet.productLinks) {
        // 去重
        if (seenUrls.has(link)) {
          continue;
        }
        seenUrls.add(link);

        // 从链接提取商品 ID
        const productId = this.extractProductId(link);

        // 从推文内容提取商品名称（简化处理）
        const productName = this.extractProductName(tweet.content);

        products.push({
          name: productName || `Product from X: ${tweet.author.username}`,
          description: tweet.content.substring(0, 200),
          sourceUrl: link,
          sourceId: productId || tweet.tweetId,
          sourceType: "X_PLATFORM",
        });
      }

      // 如果没有商品链接但有高互动，也记录为潜在热门商品
      if (tweet.productLinks.length === 0 && tweet.stats.likes > 100) {
        products.push({
          name: `Trending: ${tweet.content.substring(0, 50)}...`,
          description: tweet.content,
          sourceUrl: tweet.tweetUrl,
          sourceId: tweet.tweetId,
          sourceType: "X_PLATFORM",
        });
      }
    }

    return products;
  }

  /**
   * 从 URL 提取商品 ID
   */
  private extractProductId(url: string): string | null {
    // Amazon ASIN
    const amazonMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    if (amazonMatch) {
      return amazonMatch[1];
    }

    // 其他平台
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || null;
    } catch {
      return null;
    }
  }

  /**
   * 从推文内容提取商品名称
   */
  private extractProductName(content: string): string | null {
    // 尝试提取 "Product Name - $Price" 格式
    const nameMatch = content.match(/^(.+?)(?:\s*-\s*|\s*:\s*|\s*\n)/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // 返回前 30 个字符作为名称
    return content.substring(0, 30).trim() || null;
  }

  /**
   * 获取爬取到的原始推文数据
   */
  getTweets(): TweetData[] {
    return this.tweets;
  }

  /**
   * 计算趋势分数
   * 基于互动数据和作者影响力
   */
  static calculateTrendScore(tweet: TweetData): number {
    const { likes, retweets, replies } = tweet.stats;

    // 基础分数
    let score = likes * 1 + retweets * 2 + replies * 1.5;

    // 作者影响力权重（如果有粉丝数）
    if (tweet.author.followersCount) {
      const followerWeight = Math.log10(Math.max(tweet.author.followersCount, 1)) / 10;
      score *= 1 + followerWeight;
    }

    // 时间衰减（越新的推文分数越高）
    const tweetDate = new Date(tweet.createdAt);
    const daysSince = (Date.now() - tweetDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeDecay = Math.max(0.1, 1 - daysSince / 7); // 7天内衰减
    score *= timeDecay;

    return Math.round(score);
  }
}
