/**
 * 昨天数据统计任务 - 处理器
 * 处理 BullMQ 任务
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { getAllCategories } from "../../utils/database-queries.js";
import { db, products, productCategories, categoryHeatStats } from "@good-trending/database";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { YesterdayStatsCrawler } from "./crawler.js";
import { YESTERDAY_STATS_CONFIG } from "./scheduler.js";
import type { YesterdayStatsConfig, CategoryHeatResult, DiscoveredProduct } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { formatDate } from "../../utils/date.js";

const logger = createSchedulerLogger("yesterday-stats-processor");

/**
 * 处理昨天数据统计任务
 */
export async function processYesterdayStatsJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理昨天数据统计任务`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "yesterday-stats",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  let crawler: YesterdayStatsCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();

    if (categoryList.length === 0) {
      logger.warn("未找到类目，跳过任务");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫
    const config: Partial<YesterdayStatsConfig> = {
      headless: data.headless ?? true,
      maxResultsPerCategory: YESTERDAY_STATS_CONFIG.defaults.maxResultsPerCategory,
      maxProductsPerCategory:
        data.maxProducts ?? YESTERDAY_STATS_CONFIG.defaults.maxProductsPerCategory,
      saveToDb: data.saveToDb ?? true,
    };

    crawler = new YesterdayStatsCrawler(config);

    // 执行爬取
    const crawlResult = await crawler.crawl(categoryList);

    result.totalProducts = crawlResult.products.length;
    result.errorCount = crawlResult.errors.length;

    // 保存类目热度
    if (data.saveToDb !== false && crawlResult.heatResults.length > 0) {
      await saveCategoryHeatStats(crawlResult.heatResults);
    }

    // 保存商品
    if (data.saveToDb !== false && crawlResult.products.length > 0) {
      const savedCount = await saveDiscoveredProducts(crawlResult.products);
      result.savedProducts = savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    logger.info(`昨天数据统计任务完成`, {
      jobId: job.id,
      totalCategories: crawlResult.heatResults.length,
      totalProducts: result.totalProducts,
      savedCount: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Yesterday stats");
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
 * 保存类目热度统计数据
 */
async function saveCategoryHeatStats(stats: CategoryHeatResult[]): Promise<void> {
  const today = formatDate(new Date());

  for (const stat of stats) {
    try {
      // 检查是否已存在今日记录
      const existing = await db
        .select({ id: categoryHeatStats.id })
        .from(categoryHeatStats)
        .where(
          and(
            eq(categoryHeatStats.categoryId, stat.categoryId),
            eq(categoryHeatStats.statDate, today)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新现有记录
        await db
          .update(categoryHeatStats)
          .set({
            redditResultCount: stat.redditResultCount,
            xResultCount: stat.xResultCount,
            updatedAt: new Date(),
          })
          .where(eq(categoryHeatStats.id, existing[0].id));

        logger.debug(`更新类目热度统计: ${stat.categoryName}`);
      } else {
        // 创建新记录
        await db.insert(categoryHeatStats).values({
          categoryId: stat.categoryId,
          statDate: today,
          redditResultCount: stat.redditResultCount,
          xResultCount: stat.xResultCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        logger.debug(`创建类目热度统计: ${stat.categoryName}`);
      }
    } catch (error) {
      logger.error(`保存类目热度统计失败 ${stat.categoryName}: ${error}`);
    }
  }

  logger.info(`保存类目热度统计完成: ${stats.length}`);
}

/**
 * 保存发现的商品
 */
async function saveDiscoveredProducts(products: DiscoveredProduct[]): Promise<number> {
  let savedCount = 0;

  for (const product of products) {
    try {
      // 检查是否已存在
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.amazonId, product.amazonId))
        .limit(1);

      if (existing.length > 0) {
        logger.debug(`商品已存在，跳过: ${product.amazonId}`);
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
        description: product.description || null,
        image: product.image || null,
        price: product.price?.toString() || null,
        currency: product.currency,
        amazonId: product.amazonId,
        sourceUrl: product.url,
        discoveredFrom: "REDDIT",
        firstSeenAt: product.firstSeenAt.toISOString().split("T")[0],
      });

      // 创建类目关联
      await db.insert(productCategories).values({
        productId,
        categoryId: product.discoveredFromCategory,
      });

      savedCount++;
      logger.info(`保存商品: ${product.name.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`保存商品失败 ${product.amazonId}: ${error}`);
    }
  }

  logger.info(`保存商品完成: ${savedCount}/${products.length}`);
  return savedCount;
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
