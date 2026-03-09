/**
 * 昨天数据统计处理器
 * 处理昨天数据统计任务 - 合并类目热度和商品发现
 */
import { Job } from "bullmq";
import { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError, safeCloseBrowser } from "../../utils/error-handler.js";
import { importCrawler } from "../../utils/dynamic-imports.js";
import { getAllCategories } from "../../utils/database-queries.js";
import { CRAWLER_CONFIG } from "../../constants/index.js";
import type { CrawlerInstance } from "../../types/index.js";
import type { CrawlerStatus } from "@good-trending/crawler/crawlers/BaseCrawler";

const logger = createSchedulerLogger("yesterday-stats");

/**
 * 爬取结果接口
 */
interface CrawlResult {
  heatResults: unknown[];
  products: unknown[];
  errors: string[];
  success: boolean;
}

/**
 * 处理昨天数据统计任务
 * 合并类目热度和商品发现，一次遍历同时处理
 */
export async function processYesterdayStatsJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();
  let crawler: CrawlerInstance | null = null;

  logger.info(`Processing yesterday stats job`, {
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

  try {
    const [
      { saveCategoryHeatStats, saveCrawledProducts, saveCrawlerLog, GoogleSearchCrawler },
      categoryList,
    ] = await Promise.all([importCrawler(), getAllCategories()]);

    if (categoryList.length === 0) {
      logger.warn("No categories found, skipping yesterday stats");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫实例
    crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: CRAWLER_CONFIG.BROWSER_TIMEOUT },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: CRAWLER_CONFIG.PRODUCT_DISCOVERY.MAX_RESULTS_PER_CATEGORY,
          maxProductsPerCategory:
            data.maxProducts ?? CRAWLER_CONFIG.PRODUCT_DISCOVERY.DEFAULT_MAX_PRODUCTS,
          searchDelayRange: [
            CRAWLER_CONFIG.PRODUCT_DISCOVERY.SEARCH_DELAY_MIN,
            CRAWLER_CONFIG.PRODUCT_DISCOVERY.SEARCH_DELAY_MAX,
          ],
        },
      }
    ) as unknown as CrawlerInstance;

    // 合并爬取类目热度和商品（一次遍历）
    const crawlResult = (await crawler.crawlCategoryHeatAndProducts(categoryList)) as CrawlResult;

    // 保存类目热度
    if (crawlResult.heatResults.length > 0) {
      await saveCategoryHeatStats(crawlResult.heatResults);
    }

    // 保存商品
    result.totalProducts = crawlResult.products.length;
    if (data.saveToDb !== false && crawlResult.products.length > 0) {
      const saveResult = await saveCrawledProducts(crawlResult.products, "REDDIT");
      result.savedProducts = saveResult.savedCount;
    }

    result.errorCount = crawlResult.errors.length;

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "YESTERDAY_STATS",
      sourceType: "REDDIT",
      status: (crawlResult.success ? "COMPLETED" : "FAILED") as CrawlerStatus,
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors:
        crawlResult.errors.length > 0 ? crawlResult.errors.map((e) => ({ message: e })) : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        categoryCount: categoryList.length,
        heatCount: crawlResult.heatResults.length,
      },
    });

    logger.info(`Yesterday stats job completed`, {
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
    await safeCloseBrowser(crawler);
  }
}
