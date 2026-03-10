/**
 * 类目热度任务 - 处理器
 * 处理 BullMQ 任务
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { getAllCategories } from "../../utils/database-queries.js";
import { db, categoryHeatStats } from "@good-trending/database";
import { eq, and } from "drizzle-orm";
import { CategoryHeatCrawler } from "./crawler.js";
import { CATEGORY_HEAT_CONFIG } from "./scheduler.js";
import type { CategoryHeatConfig, CategoryHeatResult } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { formatDate } from "../../utils/date.js";

const logger = createSchedulerLogger("category-heat-processor");

/**
 * 处理类目热度任务
 */
export async function processCategoryHeatJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理类目热度任务`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "category-heat",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  let crawler: CategoryHeatCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();

    if (categoryList.length === 0) {
      logger.warn("未找到类目，跳过任务");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫
    const config: Partial<CategoryHeatConfig> = {
      headless: data.headless ?? true,
      maxResultsPerCategory: CATEGORY_HEAT_CONFIG.defaults.maxResultsPerCategory,
      saveToDb: data.saveToDb ?? true,
    };

    crawler = new CategoryHeatCrawler(config);

    // 执行爬取
    const crawlResult = await crawler.crawl(categoryList);

    result.totalProducts = crawlResult.data.length;
    result.errorCount = crawlResult.errors.length;

    // 保存结果到数据库
    if (data.saveToDb !== false && crawlResult.data.length > 0) {
      const savedCount = await saveCategoryHeatStats(crawlResult.data);
      result.savedProducts = savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    logger.info(`类目热度任务完成`, {
      jobId: job.id,
      totalCategories: result.totalProducts,
      savedCount: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Category heat");
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
async function saveCategoryHeatStats(stats: CategoryHeatResult[]): Promise<number> {
  let savedCount = 0;
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

      savedCount++;
    } catch (error) {
      logger.error(`保存类目热度统计失败 ${stat.categoryName}: ${error}`);
    }
  }

  logger.info(`保存类目热度统计完成: ${savedCount}/${stats.length}`);
  return savedCount;
}
