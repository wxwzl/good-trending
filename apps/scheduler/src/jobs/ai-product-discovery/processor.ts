/**
 * AI 商品发现任务 - 处理器
 * 处理 BullMQ 任务
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { getAllCategories } from "../../utils/database-queries.js";
import { db, products, productCategories } from "@good-trending/database";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { AIProductDiscoveryCrawler } from "./crawler.js";
import { AI_PRODUCT_DISCOVERY_CONFIG } from "./scheduler.js";
import type { AIProductDiscoveryConfig, DiscoveredProduct } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { createSocialMentionService } from "@good-trending/crawler";
import { formatDate } from "../../utils/date.js";

const logger = createSchedulerLogger("ai-product-discovery-processor");

/**
 * 处理 AI 商品发现任务
 */
export async function processAIProductDiscoveryJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理 AI 商品发现任务`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "ai-product-discovery",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  let crawler: AIProductDiscoveryCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();

    if (categoryList.length === 0) {
      logger.warn("未找到类目，跳过任务");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫
    const config: Partial<AIProductDiscoveryConfig> = {
      headless: data.headless ?? true,
      maxCategories: data.maxProducts ?? AI_PRODUCT_DISCOVERY_CONFIG.defaults.maxCategories,
      productsPerKeyword: AI_PRODUCT_DISCOVERY_CONFIG.defaults.productsPerKeyword,
      saveToDb: data.saveToDb ?? true,
    };

    crawler = new AIProductDiscoveryCrawler(config);

    // 执行爬取
    const crawlResult = await crawler.crawl(categoryList);

    result.totalProducts = crawlResult.products.length;

    // 保存商品到数据库
    if (data.saveToDb !== false && crawlResult.products.length > 0) {
      const savedCount = await saveDiscoveredProducts(crawlResult.products);
      result.savedProducts = savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    logger.info(`AI 商品发现任务完成`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "AI Product Discovery");
    throw error;
  } finally {
    if (crawler) {
      await crawler.close().catch((err) => {
        logger.error("关闭爬虫失败", { error: String(err) });
      });
    }
  }
}

/**
 * 保存发现的商品并统计社交提及
 * 注意：不更新 product_appearance_stat 的 Bitmap 字段
 */
async function saveDiscoveredProducts(discoveredProducts: DiscoveredProduct[]): Promise<number> {
  let savedCount = 0;
  const socialMentionService = createSocialMentionService();

  for (const product of discoveredProducts) {
    try {
      // 检查是否已存在
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.amazonId, product.asin))
        .limit(1);

      if (existing.length > 0) {
        logger.debug(`商品已存在，跳过: ${product.asin}`);
        continue;
      }

      // 生成 slug
      const slug = generateSlug(product.name);
      const uniqueSlug = await generateUniqueSlug(slug);

      // 创建商品
      const productId = createId();
      await db.insert(products).values({
        id: productId,
        name: product.name,
        slug: uniqueSlug,
        description: null,
        image: product.image || null,
        price: product.price?.toString() || null,
        currency: product.currency,
        amazonId: product.asin,
        sourceUrl: product.url,
        discoveredFrom: "REDDIT",
        firstSeenAt: new Date().toISOString().split("T")[0],
      });

      // 创建类目关联
      await db.insert(productCategories).values({
        productId,
        categoryId: product.categoryId,
      });

      // 注意：不更新 product_appearance_stat 表
      // 因为 AI 分析发现的商品准确性较低

      // 统计社交提及并保存到 product_social_stats
      try {
        const mentionStats = await socialMentionService.countMentions(
          productId,
          product.name,
          new Date()
        );

        // 保存到社交统计表
        await saveProductSocialStatsFromMention(productId, mentionStats);
        logger.info(`统计并保存社交提及: ${product.name.substring(0, 30)}...`);
      } catch (mentionError) {
        logger.warn(`统计社交提及失败: ${mentionError}`);
        // 不影响主流程，继续处理下一个商品
      }

      savedCount++;
      logger.info(`保存商品: ${product.name.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`保存商品失败 ${product.asin}: ${error}`);
    }
  }

  return savedCount;
}

/**
 * 从提及统计结果保存到数据库
 */
async function saveProductSocialStatsFromMention(
  productId: string,
  stats: {
    today: { reddit: number; x: number };
    yesterday: { reddit: number; x: number };
    thisWeek: { reddit: number; x: number };
    thisMonth: { reddit: number; x: number };
    last7Days: { reddit: number; x: number };
    last15Days: { reddit: number; x: number };
    last30Days: { reddit: number; x: number };
    last60Days: { reddit: number; x: number };
  }
): Promise<void> {
  const { productSocialStats } = await import("@good-trending/database");
  const { createId } = await import("@paralleldrive/cuid2");

  const today = new Date();
  const statDate = formatDate(today);

  await db.insert(productSocialStats).values({
    id: createId(),
    productId,
    statDate,
    todayRedditCount: stats.today.reddit,
    todayXCount: stats.today.x,
    yesterdayRedditCount: stats.yesterday.reddit,
    yesterdayXCount: stats.yesterday.x,
    thisWeekRedditCount: stats.thisWeek.reddit,
    thisWeekXCount: stats.thisWeek.x,
    thisMonthRedditCount: stats.thisMonth.reddit,
    thisMonthXCount: stats.thisMonth.x,
    last7DaysRedditCount: stats.last7Days.reddit,
    last7DaysXCount: stats.last7Days.x,
    last15DaysRedditCount: stats.last15Days.reddit,
    last15DaysXCount: stats.last15Days.x,
    last30DaysRedditCount: stats.last30Days.reddit,
    last30DaysXCount: stats.last30Days.x,
    last60DaysRedditCount: stats.last60Days.reddit,
    last60DaysXCount: stats.last60Days.x,
  });
}

/**
 * 生成 slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * 生成唯一的 slug
 */
async function generateUniqueSlug(slug: string): Promise<string> {
  const existing = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existing.length === 0) {
    return slug;
  }

  // 添加随机后缀
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}
