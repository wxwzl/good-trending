/**
 * 爬虫队列处理器（crawler-queue 的消费端）
 *
 * 使用**策略路由模式**：BullMQ Worker 监听 `crawler-queue`，接收到任务后
 * 根据 `job.data.source`（任务类型标识）从 `jobHandlers` 映射表中查找对应的
 * 处理函数并执行，而不是通过 if/else 分支。
 *
 * 新增任务类型只需：
 * 1. 在 `jobs/` 目录创建五文件结构模块
 * 2. 在 `jobHandlers` 中添加一行映射
 *
 * 当前注册的处理器：
 * - `ai-product-discovery`  → AI 驱动的 Reddit → Amazon 商品发现
 * - `category-heat`         → 类目搜索热度统计
 * - `product-discovery`     → 传统商品发现（无 AI）
 * - `yesterday-stats`       → 昨天数据综合统计
 * - `product-mentions`      → 商品社交提及数统计
 * - `data-cleanup`          → 过期数据清理 + 创建分区表
 */
import { Worker, Job } from "bullmq";
import { CrawlerJobData, CrawlerJobResult, QUEUE_NAMES } from "../../queue/index.js";
import { redisConnectionOptions } from "../../queue/redis.js";
import { createSchedulerLogger } from "../../utils/logger.js";
import { CRAWLER_CONFIG } from "../../constants/index.js";

// 从新架构导入任务处理器
import { processAIProductDiscoveryJob } from "../../jobs/ai-product-discovery/processor.js";
import { processCategoryHeatJob } from "../../jobs/category-heat/processor.js";
import { processProductDiscoveryJob } from "../../jobs/product-discovery/processor.js";
import { processYesterdayStatsJob } from "../../jobs/yesterday-stats/processor.js";
import { processProductMentionsJob } from "../../jobs/product-mentions/processor.js";
import { processDataCleanupJob } from "../../jobs/data-cleanup/processor.js";

const logger = createSchedulerLogger("crawler-processor");

/**
 * 爬虫处理器实例
 */
let crawlerWorker: Worker<CrawlerJobData, CrawlerJobResult> | null = null;

/**
 * 处理器映射表
 * 策略模式：根据任务类型路由到对应的处理器
 */
const jobHandlers: Record<string, (job: Job<CrawlerJobData>) => Promise<CrawlerJobResult>> = {
  "ai-product-discovery": processAIProductDiscoveryJob,
  "category-heat": processCategoryHeatJob,
  "product-discovery": processProductDiscoveryJob,
  "yesterday-stats": processYesterdayStatsJob,
  "product-mentions": processProductMentionsJob,
  "data-cleanup": processDataCleanupJob,
};

/**
 * 处理爬虫任务
 * 根据任务类型路由到不同的处理函数
 *
 * @param job - BullMQ 任务对象
 * @returns 任务结果
 * @throws 当任务类型未知时抛出错误
 */
async function processCrawlerJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;

  logger.info(`Processing crawler job`, {
    jobId: job.id,
    source: data.source,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const handler = jobHandlers[data.source];

  if (!handler) {
    const errorMsg = `Unknown crawler source: ${data.source}`;
    logger.error(errorMsg, {
      jobId: job.id,
      availableHandlers: Object.keys(jobHandlers),
    });
    throw new Error(errorMsg);
  }

  return handler(job);
}

/**
 * 创建爬虫处理器
 *
 * @param concurrency - 并发数，默认为 1
 * @returns Worker 实例
 */
export function createCrawlerProcessor(
  concurrency: number = 1
): Worker<CrawlerJobData, CrawlerJobResult> {
  if (crawlerWorker) {
    logger.warn("Crawler processor already exists, returning existing instance");
    return crawlerWorker;
  }

  crawlerWorker = new Worker<CrawlerJobData, CrawlerJobResult>(
    QUEUE_NAMES.CRAWLER,
    processCrawlerJob,
    {
      connection: redisConnectionOptions,
      concurrency,
      limiter: {
        max: CRAWLER_CONFIG.WORKER_LIMITER.MAX,
        duration: CRAWLER_CONFIG.WORKER_LIMITER.DURATION_MS,
      },
    }
  );

  // 事件监听
  crawlerWorker.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed successfully`, {
      source: result.source,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      duration: result.duration,
    });
  });

  crawlerWorker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} failed`, {
      source: job?.data.source,
      traceId: job?.data.traceId,
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

/**
 * 获取处理器列表
 * 用于调试和监控
 */
export function getRegisteredHandlers(): string[] {
  return Object.keys(jobHandlers);
}
