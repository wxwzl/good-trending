/**
 * 商品提及统计任务 - 处理器
 * 处理 BullMQ 任务
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { getProducts } from "../../utils/database-queries.js";
import { db, productSocialStats } from "@good-trending/database";
import { createId } from "@paralleldrive/cuid2";
import { ProductMentionsCrawler } from "./crawler.js";
import { PRODUCT_MENTIONS_CONFIG } from "./scheduler.js";
import type { ProductMentionsConfig, ProductMentionResult } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { formatDate } from "../../utils/date.js";

const logger = createSchedulerLogger("product-mentions-processor");

/**
 * 处理商品提及统计任务
 */
export async function processProductMentionsJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理商品提及统计任务`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "product-mentions",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  let crawler: ProductMentionsCrawler | null = null;

  try {
    // 获取商品列表
    const productList = await getProducts(
      data.maxProducts ?? PRODUCT_MENTIONS_CONFIG.defaults.maxProducts
    );

    if (productList.length === 0) {
      logger.warn("未找到商品，跳过任务");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫
    const config: Partial<ProductMentionsConfig> = {
      headless: data.headless ?? true,
      maxProducts: data.maxProducts ?? PRODUCT_MENTIONS_CONFIG.defaults.maxProducts,
      saveToDb: data.saveToDb ?? true,
    };

    crawler = new ProductMentionsCrawler(config);

    // 执行爬取
    const crawlResult = await crawler.crawl(productList);

    result.totalProducts = productList.length;
    result.errorCount = crawlResult.errors.length;

    // 保存结果到数据库
    if (data.saveToDb !== false && crawlResult.results.length > 0) {
      let savedCount = 0;
      for (const mentionResult of crawlResult.results) {
        try {
          await saveProductSocialStats(mentionResult);
          savedCount++;
        } catch (error) {
          logger.error(`保存商品社交统计失败 ${mentionResult.productName}: ${error}`);
        }
      }
      result.savedProducts = savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    logger.info(`商品提及统计任务完成`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      errorCount: result.errorCount,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Product mentions");
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
 * 保存商品社交统计数据
 */
async function saveProductSocialStats(result: ProductMentionResult): Promise<void> {
  const today = new Date();
  const statDate = formatDate(today);

  try {
    await db.insert(productSocialStats).values({
      id: createId(),
      productId: result.productId,
      statDate,
      todayRedditCount: result.stats.today.reddit,
      todayXCount: result.stats.today.x,
      yesterdayRedditCount: result.stats.yesterday.reddit,
      yesterdayXCount: result.stats.yesterday.x,
      thisWeekRedditCount: result.stats.thisWeek.reddit,
      thisWeekXCount: result.stats.thisWeek.x,
      thisMonthRedditCount: result.stats.thisMonth.reddit,
      thisMonthXCount: result.stats.thisMonth.x,
      last7DaysRedditCount: result.stats.last7Days.reddit,
      last7DaysXCount: result.stats.last7Days.x,
      last15DaysRedditCount: result.stats.last15Days.reddit,
      last15DaysXCount: result.stats.last15Days.x,
      last30DaysRedditCount: result.stats.last30Days.reddit,
      last30DaysXCount: result.stats.last30Days.x,
      last60DaysRedditCount: result.stats.last60Days.reddit,
      last60DaysXCount: result.stats.last60Days.x,
    });

    logger.debug(`保存商品社交统计: ${result.productName}`);
  } catch (error) {
    logger.error(`保存商品社交统计失败 ${result.productName}: ${error}`);
    throw error;
  }
}
