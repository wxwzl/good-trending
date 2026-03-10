/**
 * AI 商品发现任务 - 爬虫实现
 * 使用 AI 分析 Reddit 帖子，提取关键词后在亚马逊搜索商品
 */

import type { Page, Browser } from "playwright";
import { chromium } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import {
  createAIAnalyzer,
  createAmazonSearchService,
  createRedditService,
} from "@good-trending/crawler";
import { GoogleSearchService } from "@good-trending/crawler";
import type { AIProductDiscoveryConfig, DiscoveredProduct, ProcessedPost } from "./types.js";

const logger = createLoggerInstance("ai-product-discovery-crawler");

/**
 * AI 商品发现爬虫
 */
export class AIProductDiscoveryCrawler {
  private config: AIProductDiscoveryConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;

  // 服务（延迟初始化）
  private aiAnalyzer: ReturnType<typeof createAIAnalyzer> | null = null;
  private amazonSearch = createAmazonSearchService();
  private redditService = createRedditService();
  private googleSearch = new GoogleSearchService();

  constructor(config: Partial<AIProductDiscoveryConfig> = {}) {
    this.config = {
      headless: true,
      maxCategories: 10,
      productsPerKeyword: 6,
      saveToDb: true,
      ...config,
    };
  }

  /**
   * 获取或创建 AI 分析器（延迟初始化）
   */
  private getAIAnalyzer() {
    if (!this.aiAnalyzer) {
      this.aiAnalyzer = createAIAnalyzer();
    }
    return this.aiAnalyzer;
  }

  /**
   * 初始化浏览器
   */
  private async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    logger.info("初始化浏览器...");

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    this.page = await this.browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    logger.info("浏览器初始化完成");
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    await this.amazonSearch.closeBrowser();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    logger.info("爬虫资源已释放");
  }

  /**
   * 执行爬取
   * @param categories - 类目列表
   * @returns 发现的商品列表
   */
  async crawl(
    categories: Array<{ id: string; name: string; searchKeywords?: string | null }>
  ): Promise<{
    posts: ProcessedPost[];
    products: DiscoveredProduct[];
    stats: {
      postsProcessed: number;
      keywordsExtracted: number;
      productsFound: number;
    };
  }> {
    logger.info("开始 AI 商品发现爬取...");

    await this.initBrowser();

    const processedPosts: ProcessedPost[] = [];
    const allProducts: DiscoveredProduct[] = [];

    // 限制类目数
    const targetCategories = categories.slice(0, this.config.maxCategories);

    for (const category of targetCategories) {
      try {
        logger.info(`处理类目: ${category.name}`);

        // 1. 搜索该类目的 Reddit 帖子
        const posts = await this.searchRedditPosts(category.name);
        logger.info(`找到 ${posts.length} 个 Reddit 帖子`);

        // 2. 处理每个帖子
        for (const postUrl of posts.slice(0, 5)) {
          // 每类目最多处理5个帖子
          try {
            const processedPost = await this.processPost(postUrl, category.id);

            if (processedPost.products.length > 0) {
              processedPosts.push(processedPost);
              allProducts.push(...processedPost.products);
            }
          } catch (error) {
            logger.error(`处理帖子失败 ${postUrl}: ${error}`);
          }
        }
      } catch (error) {
        logger.error(`处理类目失败 ${category.name}: ${error}`);
      }
    }

    logger.info(
      `爬取完成: 处理 ${processedPosts.length} 个帖子, 发现 ${allProducts.length} 个商品`
    );

    return {
      posts: processedPosts,
      products: allProducts,
      stats: {
        postsProcessed: processedPosts.length,
        keywordsExtracted: processedPosts.reduce((sum, p) => sum + p.keywords.length, 0),
        productsFound: allProducts.length,
      },
    };
  }

  /**
   * 搜索 Reddit 帖子
   */
  private async searchRedditPosts(keyword: string): Promise<string[]> {
    logger.info(`搜索 Reddit 帖子: ${keyword}`);

    // 计算30天前的日期
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const afterDate = thirtyDaysAgo.toISOString().split("T")[0];

    const query = `site:reddit.com ${keyword} after:${afterDate}`;

    const result = await this.googleSearch.search(query, this.page || undefined);

    if (!result.success) {
      logger.warn(`搜索失败: ${result.error}`);
      return [];
    }

    // 过滤出 Reddit 帖子链接
    const redditLinks = result.links
      .filter((link) => link.url.includes("reddit.com/r/"))
      .map((link) => link.url);

    return [...new Set(redditLinks)]; // 去重
  }

  /**
   * 处理单个 Reddit 帖子
   */
  private async processPost(postUrl: string, categoryId: string): Promise<ProcessedPost> {
    logger.info(`处理帖子: ${postUrl}`);

    // 1. 获取帖子内容
    if (!this.page) {
      throw new Error("浏览器页面未初始化");
    }
    const post = await this.redditService.fetchPost(this.page, postUrl);

    // 2. AI 分析提取关键词
    const analysis = await this.getAIAnalyzer().analyze({
      title: post.title,
      content: post.content || "",
      comments: post.comments,
    });

    if (!analysis || analysis.keywords.length === 0) {
      logger.info(`未提取到关键词: ${postUrl}`);
      return {
        url: postUrl,
        title: post.title,
        keywords: [],
        products: [],
      };
    }

    logger.info(`提取到 ${analysis.keywords.length} 个关键词: ${analysis.keywords.join(", ")}`);

    // 3. 对每个关键词搜索亚马逊
    const products: DiscoveredProduct[] = [];
    const seenAsins = new Set<string>();

    for (const keyword of analysis.keywords.slice(0, 3)) {
      // 最多3个关键词
      try {
        const amazonProducts = await this.amazonSearch.searchByKeyword(
          keyword,
          this.config.productsPerKeyword
        );

        for (const product of amazonProducts) {
          if (!seenAsins.has(product.asin)) {
            seenAsins.add(product.asin);
            products.push({
              ...product,
              sourcePostUrl: postUrl,
              extractedKeyword: keyword,
              categoryId,
            });
          }
        }
      } catch (error) {
        logger.error(`亚马逊搜索失败 "${keyword}": ${error}`);
      }
    }

    return {
      url: postUrl,
      title: post.title,
      keywords: analysis.keywords,
      products,
    };
  }
}
