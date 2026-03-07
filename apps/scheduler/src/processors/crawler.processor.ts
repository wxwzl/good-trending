/**
 * 爬虫任务处理器
 * 处理爬虫队列中的任务
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
 * 将爬取的产品数据保存到数据库
 * 使用共享的数据库模块
 */
async function saveProductsToDatabase(
  productDataList: Array<{
    name: string;
    description?: string;
    image?: string;
    price?: number;
    currency?: string;
    sourceUrl: string;
    sourceId: string;
    sourceType: "X_PLATFORM" | "AMAZON";
    topics?: string[];
  }>,
  _sourceType: string
): Promise<number> {
  // 动态导入数据库模块
  const { createProductsBatch } = await import("@good-trending/database");

  // 转换为统一的输入格式
  const inputs = productDataList.map((productData) => ({
    name: productData.name,
    description: productData.description,
    image: productData.image,
    price: productData.price,
    currency: productData.currency,
    sourceUrl: productData.sourceUrl,
    sourceId: productData.sourceId,
    sourceType: productData.sourceType,
    topics: productData.topics,
  }));

  // 使用共享的批量创建函数
  const result = await createProductsBatch(inputs);

  // 记录结果
  if (result.savedCount > 0) {
    logger.debug(`Saved ${result.savedCount} products to database`);
  }
  if (result.skippedCount > 0) {
    logger.debug(`Skipped ${result.skippedCount} existing products`);
  }
  if (result.failedCount > 0) {
    logger.error(`Failed to save ${result.failedCount} products`, result.errors);
  }

  return result.savedCount;
}

/**
 * 记录爬虫日志到数据库
 */
async function logCrawlerRun(params: {
  sourceType: "X_PLATFORM" | "AMAZON";
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsFound: number;
  itemsSaved: number;
  errors?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { db, crawlerLogs } = await import("@good-trending/database");

    await db.insert(crawlerLogs).values({
      sourceType: params.sourceType,
      status: params.status,
      startTime: params.startTime,
      endTime: params.endTime ?? null,
      duration: params.duration ?? null,
      itemsFound: params.itemsFound,
      itemsSaved: params.itemsSaved,
      errors: params.errors ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    logger.error(`Failed to log crawler run: ${error}`);
  }
}

/**
 * 动态导入爬虫模块
 * 避免在模块加载时初始化 Playwright
 */
async function importCrawlers() {
  // 使用相对路径导入爬虫模块
  const crawlerBasePath = "../../crawler/src";
  const { CrawlerManager } = await import(`${crawlerBasePath}/manager`);
  const { AmazonCrawler } = await import(`${crawlerBasePath}/crawlers/amazon`);
  const { TwitterCrawler } = await import(`${crawlerBasePath}/crawlers/twitter`);
  return { CrawlerManager, AmazonCrawler, TwitterCrawler };
}

/**
 * 处理爬虫任务
 *
 * @param job - BullMQ 任务对象
 * @returns 任务结果
 */
async function processCrawlerJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`Processing crawler job`, {
    jobId: job.id,
    source: data.source,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: data.source,
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    // 动态导入爬虫模块
    const { CrawlerManager, AmazonCrawler, TwitterCrawler } = await importCrawlers();

    // 创建爬虫管理器
    const manager = new CrawlerManager({ logLevel: "info" });

    // 根据来源注册对应的爬虫
    if (data.source === "amazon") {
      const amazonCrawler = new AmazonCrawler(
        { headless: data.headless ?? true },
        { maxProducts: data.maxProducts ?? 20 }
      );
      manager.register("amazon", amazonCrawler);
    } else if (data.source === "twitter") {
      const twitterCrawler = new TwitterCrawler(
        { headless: data.headless ?? true },
        { maxTweets: data.maxProducts ?? 20 }
      );
      manager.register("twitter", twitterCrawler);
    }

    // 执行爬虫
    const crawlResult = await manager.runCrawler(data.source);

    if (!crawlResult) {
      throw new Error(`Crawler ${data.source} returned null result`);
    }

    result.totalProducts = crawlResult.total;
    result.errorCount = crawlResult.errors.length;

    // 保存到数据库
    if (data.saveToDb !== false && crawlResult.data.length > 0) {
      const productDataList = crawlResult.data.map(
        (item: {
          name: string;
          description?: string;
          image?: string;
          price?: number;
          currency?: string;
          sourceUrl: string;
          sourceId: string;
          sourceType: "X_PLATFORM" | "AMAZON";
        }) => ({
          name: item.name,
          description: item.description,
          image: item.image,
          price: item.price,
          currency: item.currency,
          sourceUrl: item.sourceUrl,
          sourceId: item.sourceId,
          sourceType: item.sourceType,
        })
      );

      result.savedProducts = await saveProductsToDatabase(
        productDataList,
        data.source === "amazon" ? "AMAZON" : "X_PLATFORM"
      );
    }

    // 记录成功的爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await logCrawlerRun({
      sourceType: data.source === "amazon" ? "AMAZON" : "X_PLATFORM",
      status: "COMPLETED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: crawlResult.errors.length > 0 ? crawlResult.errors : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        headless: data.headless,
        maxProducts: data.maxProducts,
      },
    });

    logger.info(`Crawler job completed`, {
      jobId: job.id,
      source: data.source,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Crawler job failed`, {
      jobId: job.id,
      source: data.source,
      error: errorMessage,
      stack: errorStack,
    });

    // 记录失败的爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();
    result.errorCount = 1;

    await logCrawlerRun({
      sourceType: data.source === "amazon" ? "AMAZON" : "X_PLATFORM",
      status: "FAILED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors: [errorMessage],
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        errorStack,
      },
    });

    throw error;
  }
}

/**
 * 创建爬虫处理器
 *
 * @param concurrency - 并发数
 * @returns Worker 实例
 */
export function createCrawlerProcessor(
  concurrency: number = 1
): Worker<CrawlerJobData, CrawlerJobResult> {
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
