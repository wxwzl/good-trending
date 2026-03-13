/**
 * Reddit Crawlee 实现
 * 实现 IReddit 接口，与 AI 分析服务兼容
 */

import { BaseCrawleeCrawler, type CrawleeRequestContext } from "../base/base-crawler.js";
import type { RedditPostData } from "./types.js";
import type { IReddit } from "../../../domain/interfaces/index.js";
import type { RedditPost } from "../../../domain/types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("reddit-crawler");

/**
 * Reddit Crawlee 实现
 * 实现 IReddit 接口
 *
 * 返回的 RedditPost 格式与 AI 分析服务兼容
 * 可直接传递给 AIAnalyzer.analyze(post)
 */
export class RedditCrawler extends BaseCrawleeCrawler<RedditPostData> implements IReddit {
  private maxComments: number = 10;
  private expandComments: boolean = true;

  constructor() {
    super({
      name: "reddit-crawler",
      maxConcurrency: 2, // Reddit 限制严格，降低并发
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 90, // Reddit 加载较慢
      maxRequestsPerCrawl: 30,
    });
  }

  /**
   * 处理 Reddit 帖子请求
   */
  protected async handleRequest({
    request,
    page,
    pushData,
  }: CrawleeRequestContext): Promise<void> {
    logger.info(`爬取 Reddit: ${request.url}`);

    try {
      // 等待内容加载
      await page.waitForSelector(
        'h1, [data-testid="post-container"], shreddit-post',
        {
          timeout: 15000,
        }
      );

      // 随机延迟（反检测）
      await page.waitForTimeout(1500 + Math.random() * 2000);

      // 展开评论（如果需要）
      if (this.expandComments) {
        await this.expandCommentsOnPage(page);
      }

      // 提取帖子数据 - 确保与 AI 分析服务兼容的格式
      const postData = await page.evaluate((maxComments) => {
        // 标题
        const title =
          document.querySelector("h1")?.textContent?.trim() ||
          document.querySelector("h2")?.textContent?.trim() ||
          "";

        // 内容
        const content =
          document.querySelector('[data-testid="post-content"]')?.textContent
            ?.trim() ||
          document.querySelector('div[data-click-id="text"]')?.textContent
            ?.trim() ||
          "";

        // 作者
        const author =
          document.querySelector('[data-testid="post-author-link"]')
            ?.textContent?.trim() ||
          document.querySelector('a[href^="/user/"]')?.textContent?.trim() ||
          "";

        // 点赞数
        const upvotesText =
          document.querySelector('[data-testid="upvote-button"]')?.textContent ||
          document.querySelector("faceplate-number")?.getAttribute("number") ||
          "0";
        const upvotes = parseInt(upvotesText.replace(/[^\d]/g, "")) || 0;

        // 发布时间
        const timeElement = document.querySelector("time");
        const postedAt = timeElement?.getAttribute("datetime") || "";

        // 评论列表 - 只提取文本内容
        const comments: string[] = [];
        const commentSelectors = [
          '[data-testid="comment"]',
          "shreddit-comment",
          'div[data-testid="comment"] > div',
        ];

        for (const selector of commentSelectors) {
          const commentElements = document.querySelectorAll(selector);
          commentElements.forEach((el) => {
            // 提取纯文本，过滤脚本和样式
            const text = el.textContent?.trim();
            if (text && comments.length < maxComments && text.length > 10) {
              comments.push(text);
            }
          });

          if (comments.length >= maxComments) break;
        }

        return {
          title,
          content,
          author,
          upvotes,
          postedAt,
          comments: comments.slice(0, maxComments),
        };
      }, this.maxComments);

      // 推送数据
      await pushData({
        ...postData,
        url: request.url,
        crawledAt: new Date().toISOString(),
      });

      logger.info(`成功提取帖子: ${postData.title.substring(0, 50)}...`, {
        commentsCount: postData.comments.length,
      });
    } catch (error) {
      logger.error(`爬取失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 展开评论
   */
  private async expandCommentsOnPage(page: any): Promise<void> {
    try {
      // 点击 "more replies" 或 "View more comments" 按钮
      const moreButtons = await page
        .locator(
          'button:has-text("more replies"), button:has-text("View more comments")'
        )
        .all();
      for (const button of moreButtons.slice(0, 3)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      // 点击 "Read more" 展开长内容
      const readMoreButtons = await page
        .locator('button:has-text("Read more")')
        .all();
      for (const button of readMoreButtons.slice(0, 5)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch (error) {
      logger.warn("展开评论失败:", error);
    }
  }

  /**
   * 获取帖子（实现 IReddit 接口）
   *
   * 返回的 RedditPost 格式与 AIAnalyzer.analyze(post: RedditPost) 完全兼容
   */
  async fetchPost(url: string): Promise<RedditPost | null> {
    this.maxComments = 10;

    // 清空之前的数据
    await this.clearData();

    // 添加请求
    await this.addRequests([{ url, label: "single-post" }]);

    // 运行爬虫
    await this.run();

    // 获取结果
    const data = await this.getData();
    const post = data.items[0];

    if (!post) return null;

    // 返回符合 RedditPost 接口的数据（去掉 crawledAt 元数据）
    return {
      title: post.title,
      content: post.content,
      comments: post.comments,
      url: post.url,
      author: post.author,
      postedAt: post.postedAt,
      upvotes: post.upvotes,
    };
  }

  /**
   * 批量获取帖子
   * @param urls 帖子 URL 列表
   * @param maxComments 每个帖子最大评论数
   * @returns 帖子列表
   */
  async fetchPosts(urls: string[], maxComments: number = 10): Promise<RedditPost[]> {
    this.maxComments = maxComments;

    // 清空之前的数据
    await this.clearData();

    // 添加所有请求
    await this.addRequests(urls.map((url) => ({ url, label: "batch-post" })));

    // 运行爬虫
    await this.run();

    // 获取结果
    const data = await this.getData();
    return data.items.map((post) => ({
      title: post.title,
      content: post.content,
      comments: post.comments,
      url: post.url,
      author: post.author,
      postedAt: post.postedAt,
      upvotes: post.upvotes,
    }));
  }
}

/**
 * 创建 Reddit Crawler 实例
 * @returns RedditCrawler 实例
 */
export function createRedditCrawler(): RedditCrawler {
  return new RedditCrawler();
}
