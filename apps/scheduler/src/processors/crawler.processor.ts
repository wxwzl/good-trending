/**
 * 爬虫任务处理器
 * 处理爬虫队列中的任务 - 使用新的 Google Search Crawler
 */
import { Worker, Job } from "bullmq";
import { createSchedulerLogger } from "../utils/logger";
import { CrawlerJobData, CrawlerJobResult, QUEUE_NAMES } from "../queue";
import { redisConnectionOptions } from "../queue/redis";

const logger = createSchedulerLogger("crawler-processor");

/**
 * 爬虫处理器实例
 */
let crawlerWorker: Worker<CrawlerJobData, CrawlerJobResult> | null = null;

/**
 * 动态导入爬虫模块
 * 避免在模块加载时初始化 Playwright
 */
async function importCrawler() {
  const { GoogleSearchCrawler } = await import("@good-trending/crawler/google");
  const {
    saveCategoryHeatStats,
    saveCrawledProducts,
    saveProductSocialStats,
    saveCrawlerLog,
  } = await import("@good-trending/crawler/services");
  return { GoogleSearchCrawler, saveCategoryHeatStats, saveCrawledProducts, saveProductSocialStats, saveCrawlerLog };
}

/**
 * 处理类目热度爬取任务
 */
async function processCategoryHeatJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

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
    // 动态导入爬虫模块
    const { GoogleSearchCrawler, saveCategoryHeatStats, saveCrawlerLog } = await importCrawler();
    const { db, categories } = await import("@good-trending/database");

    // 获取所有类目
    const categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        searchKeywords: categories.searchKeywords,
      })
      .from(categories);

    logger.info(`Loaded ${categoryList.length} categories`);

    // 创建爬虫实例
    const crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: 60000 },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: 10,
          searchDelayRange: [3000, 6000],
        },
      }
    );

    // 执行类目热度爬取
    const crawlResult = await crawler.crawlCategoryHeat(categoryList);

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
      status: crawlResult.success ? "COMPLETED" : "FAILED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: crawlResult.errors.length > 0 ? crawlResult.errors.map((e) => ({ message: e })) : undefined,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Category heat job failed`, {
      jobId: job.id,
      error: errorMessage,
    });

    result.errorCount = 1;
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    throw error;
  }
}

/**
 * 处理商品发现任务
 */
async function processProductDiscoveryJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`Processing product discovery job`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "product-discovery",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    // 动态导入爬虫模块
    const { GoogleSearchCrawler, saveCrawledProducts, saveCrawlerLog } = await importCrawler();
    const { db, categories } = await import("@good-trending/database");

    // 获取所有类目
    const categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        searchKeywords: categories.searchKeywords,
      })
      .from(categories);

    logger.info(`Loaded ${categoryList.length} categories for product discovery`);

    // 创建爬虫实例
    const crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: 60000 },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: data.maxProducts ?? 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 执行商品发现爬取
    const crawlResult = await crawler.crawlProductsByCategory(categoryList);

    result.totalProducts = crawlResult.data.length;
    result.errorCount = crawlResult.errors.length;

    // 保存结果到数据库
    if (data.saveToDb !== false && crawlResult.data.length > 0) {
      const saveResult = await saveCrawledProducts(crawlResult.data, "REDDIT");
      result.savedProducts = saveResult.savedCount;
    }

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "PRODUCT_DISCOVERY",
      sourceType: "REDDIT",
      status: crawlResult.success ? "COMPLETED" : "FAILED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: crawlResult.errors.length > 0 ? crawlResult.errors.map((e) => ({ message: e })) : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        categoryCount: categoryList.length,
      },
    });

    logger.info(`Product discovery job completed`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Product discovery job failed`, {
      jobId: job.id,
      error: errorMessage,
    });

    result.errorCount = 1;
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    throw error;
  }
}

/**
 * 处理社交提及统计任务
 */
async function processProductMentionsJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`Processing product mentions job`, {
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

  try {
    // 动态导入爬虫模块
    const { GoogleSearchCrawler, saveProductSocialStats, saveCrawlerLog } = await importCrawler();
    const { db, products } = await import("@good-trending/database");

    // 获取商品列表（限制数量）
    const productList = await db
      .select({
        id: products.id,
        name: products.name,
      })
      .from(products)
      .limit(data.maxProducts ?? 50);

    logger.info(`Loaded ${productList.length} products for mention crawling`);

    // 创建爬虫实例
    const crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: 60000 },
      {
        serpApiKey: process.env.SERPAPI_KEY,
      }
    );

    let processedCount = 0;
    const date = new Date();

    // 逐个处理商品
    for (const product of productList) {
      try {
        logger.info(`Processing product [${processedCount + 1}/${productList.length}]: ${product.name}`);

        // 爬取提及数
        const mentions = await crawler.crawlProductMentions(product.name, date);

        // 保存统计
        await saveProductSocialStats(product.id, date, mentions.periodResults);

        processedCount++;
        result.savedProducts++;

        // 每处理10个商品延迟一下
        if (processedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        logger.error(`Processing product ${product.name} failed:`, error);
        result.errorCount++;
      }
    }

    result.totalProducts = productList.length;

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "PRODUCT_MENTION",
      sourceType: "REDDIT",
      status: "COMPLETED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: result.errorCount > 0 ? [{ message: `${result.errorCount} products failed` }] : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        productCount: productList.length,
      },
    });

    logger.info(`Product mentions job completed`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      errorCount: result.errorCount,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Product mentions job failed`, {
      jobId: job.id,
      error: errorMessage,
    });

    result.errorCount = 1;
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    throw error;
  }
}

/**
 * 处理昨天数据统计任务
 */
async function processYesterdayStatsJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

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
    const { GoogleSearchCrawler, saveCategoryHeatStats, saveCrawledProducts, saveCrawlerLog } = await importCrawler();
    const { db, categories } = await import("@good-trending/database");

    // 获取所有类目
    const categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        searchKeywords: categories.searchKeywords,
      })
      .from(categories);

    logger.info(`Loaded ${categoryList.length} categories for yesterday stats`);

    // 创建爬虫实例
    const crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: 60000 },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: data.maxProducts ?? 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 爬取昨天类目热度
    const heatResult = await crawler.crawlYesterdayCategoryHeat(categoryList);
    if (heatResult.data.length > 0) {
      await saveCategoryHeatStats(heatResult.data);
    }

    // 爬取昨天商品
    const productResult = await crawler.crawlYesterdayProducts(categoryList);
    result.totalProducts = productResult.data.length;

    if (data.saveToDb !== false && productResult.data.length > 0) {
      const saveResult = await saveCrawledProducts(productResult.data, "REDDIT");
      result.savedProducts = saveResult.savedCount;
    }

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "YESTERDAY_STATS",
      sourceType: "REDDIT",
      status: productResult.success ? "COMPLETED" : "FAILED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: productResult.errors.length > 0 ? productResult.errors.map((e) => ({ message: e })) : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        categoryCount: categoryList.length,
      },
    });

    logger.info(`Yesterday stats job completed`, {
      jobId: job.id,
      totalCategories: heatResult.data.length,
      totalProducts: result.totalProducts,
      savedCount: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Yesterday stats job failed`, {
      jobId: job.id,
      error: errorMessage,
    });

    result.errorCount = 1;
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    throw error;
  }
}

/**
 * 处理爬虫任务
 * 根据任务类型路由到不同的处理函数
 */
async function processCrawlerJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;

  logger.info(`Processing crawler job`, {
    jobId: job.id,
    source: data.source,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  // 根据任务类型路由
  switch (data.source) {
    case "category-heat":
      return processCategoryHeatJob(job);
    case "product-discovery":
      return processProductDiscoveryJob(job);
    case "product-mentions":
      return processProductMentionsJob(job);
    case "yesterday-stats":
      return processYesterdayStatsJob(job);
    default:
      throw new Error(`Unknown crawler source: ${data.source}`);
  }
}

/**
 * 创建爬虫处理器
 * @param concurrency - 并发数
 * @returns Worker 实例
 */
export function createCrawlerProcessor(concurrency: number = 1): Worker<CrawlerJobData, CrawlerJobResult> {
  if (crawlerWorker) {
    return crawlerWorker;
  }

  crawlerWorker = new Worker<CrawlerJobData, CrawlerJobResult>(
    QUEUE_NAMES.CRAWLER,
    processCrawlerJob,
    {
      connection: redisConnectionOptions,
      concurrency,
      limiter: {
        max: 1,
        duration: 60000, // 每分钟最多 1 个任务（爬虫比较消耗资源）
      },
    }
  );

  // 事件监听
  crawlerWorker.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed successfully`, {
      source: result.source,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
    });
  });

  crawlerWorker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} failed`, {
      error: error.message,
      stack: error.stack,
    });
  });

  crawlerWorker.on("error", (error) => {
    logger.error(`Worker error`, {
      error: error.message,
      stack: error.stack,
    });
  });

  logger.info(`Crawler processor started with concurrency: ${concurrency}`);

  return crawlerWorker;
}

/**
 * 关闭爬虫处理器
 */
export async function closeCrawlerProcessor(): Promise<void> {
  if (crawlerWorker) {
    await crawlerWorker.close();
    crawlerWorker = null;
    logger.info("Crawler processor closed");
  }
}
