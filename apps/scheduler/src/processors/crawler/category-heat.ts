/**
 * 类目热度爬取处理器
 * 处理类目热度统计任务
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

const logger = createSchedulerLogger("category-heat");

/**
 * 爬取结果接口
 */
interface CrawlResult {
  data: unknown[];
  errors: string[];
  success: boolean;
}

/**
 * 处理类目热度爬取任务
 */
export async function processCategoryHeatJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();
  let crawler: CrawlerInstance | null = null;

  logger.info(`Processing category heat job`, {
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

  try {
    const [{ saveCategoryHeatStats, saveCrawlerLog, GoogleSearchCrawler }, categoryList] =
      await Promise.all([importCrawler(), getAllCategories()]);

    if (categoryList.length === 0) {
      logger.warn("No categories found, skipping category heat crawl");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫实例
    crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: CRAWLER_CONFIG.BROWSER_TIMEOUT },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: CRAWLER_CONFIG.CATEGORY_HEAT.MAX_RESULTS_PER_CATEGORY,
          searchDelayRange: [
            CRAWLER_CONFIG.CATEGORY_HEAT.SEARCH_DELAY_MIN,
            CRAWLER_CONFIG.CATEGORY_HEAT.SEARCH_DELAY_MAX,
          ],
        },
      }
    ) as unknown as CrawlerInstance;

    // 执行类目热度爬取
    const crawlResult = (await crawler.crawlCategoryHeat(categoryList)) as CrawlResult;

    result.totalProducts = crawlResult.data.length;
    result.errorCount = crawlResult.errors.length;

    // 保存结果到数据库
    if (crawlResult.data.length > 0) {
      const savedCount = await saveCategoryHeatStats(crawlResult.data);
      result.savedProducts = savedCount;
    }

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "CATEGORY_HEAT",
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
      },
    });

    logger.info(`Category heat job completed`, {
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
    await safeCloseBrowser(crawler);
  }
}
