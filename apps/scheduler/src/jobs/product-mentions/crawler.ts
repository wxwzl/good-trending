/**
 * 商品提及统计任务 - 爬虫实现
 * 统计商品在 Reddit 和 X 平台的提及次数
 */

import { createLoggerInstance } from "@good-trending/shared";
import { createSocialMentionService } from "@good-trending/crawler";
import type {
  ProductMentionsConfig,
  ProductInfo,
  ProductMentionResult,
  ProductMentionsCrawlResult,
} from "./types.js";

const logger = createLoggerInstance("product-mentions-crawler");

/**
 * 商品提及统计爬虫
 * 使用 SocialMentionService 统计商品提及
 */
export class ProductMentionsCrawler {
  private config: Required<ProductMentionsConfig>;
  private socialMentionService: ReturnType<typeof createSocialMentionService>;

  constructor(config: Partial<ProductMentionsConfig> = {}) {
    this.config = {
      headless: true,
      maxProducts: 50,
      saveToDb: true,
      ...config,
    };
    this.socialMentionService = createSocialMentionService();
  }

  /**
   * 关闭服务
   */
  async close(): Promise<void> {
    // SocialMentionService 使用 GoogleSearchService，不需要额外关闭
    logger.info("爬虫资源已释放");
  }

  /**
   * 执行商品提及统计爬取
   */
  async crawl(products: ProductInfo[]): Promise<ProductMentionsCrawlResult> {
    const startTime = Date.now();
    const results: ProductMentionResult[] = [];
    const errors: string[] = [];

    logger.info(`开始统计 ${products.length} 个商品的社交提及`);

    const today = new Date();
    let processedCount = 0;

    for (const product of products) {
      try {
        logger.info(`处理商品 [${processedCount + 1}/${products.length}]: ${product.name}`);

        // 统计提及
        const stats = await this.socialMentionService.countMentions(
          product.id,
          product.name,
          today
        );

        results.push({
          productId: product.id,
          productName: product.name,
          stats,
        });

        processedCount++;

        // 每处理5个商品延迟1秒
        if (processedCount % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`统计商品提及失败 ${product.name}: ${errorMsg}`);
        errors.push(`商品 ${product.name}: ${errorMsg}`);
        processedCount++;
      }
    }

    const duration = Date.now() - startTime;

    logger.info(`商品提及统计完成: ${results.length} 个成功, ${errors.length} 个错误`);

    return {
      success: errors.length === 0,
      results,
      errors,
      duration,
    };
  }
}
