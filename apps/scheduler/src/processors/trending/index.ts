/**
 * 趋势队列处理器（trending-queue 的消费端）
 *
 * 与爬虫处理器相同的**策略路由模式**，但监听独立的 `trending-queue`。
 * 趋势队列与爬虫队列分离的原因：
 * - 趋势计算属于纯 DB 运算，不需要启动浏览器，资源消耗模型不同
 * - 可以独立设置并发数和限流策略
 * - 任务失败互不影响
 *
 * 任务路由依据 `job.name`（而非 `job.data.type`），
 * 因为 BullMQ 的 job name 在队列中更具语义性。
 *
 * 当前注册的处理器：
 * - `trending-calculate`  → 计算 TODAY 周期趋势分数（03:00 执行）
 * - `trending-update`     → 生成全部 8 个周期榜单 + 清缓存（04:00 执行）
 */
import { Worker, Job } from "bullmq";
import { TrendingJobData, TrendingJobResult, QUEUE_NAMES } from "../../queue/index.js";
import { redisConnectionOptions } from "../../queue/redis.js";
import { createSchedulerLogger } from "../../utils/logger.js";

// 从新架构导入处理器
import { processTrendingCalculateJob } from "../../jobs/trending-calculate/processor.js";
import { processTrendingUpdateJob } from "../../jobs/trending-update/processor.js";

const logger = createSchedulerLogger("trending-processor");

/**
 * 趋势处理器实例
 */
let trendingWorker: Worker<TrendingJobData, TrendingJobResult> | null = null;

/**
 * 处理器映射表
 * 策略模式：根据任务名称路由到对应的处理器
 */
const jobHandlers: Record<string, (job: Job<TrendingJobData>) => Promise<TrendingJobResult>> = {
  "trending-calculate": processTrendingCalculateJob,
  "trending-update": processTrendingUpdateJob,
};

/**
 * 处理趋势任务
 */
async function processTrendingJob(job: Job<TrendingJobData>): Promise<TrendingJobResult> {
  const { data } = job;

  logger.info("Processing trending job", {
    jobId: job.id,
    name: job.name,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const handler = jobHandlers[job.name];

  if (!handler) {
    const errorMsg = `Unknown trending job: ${job.name}`;
    logger.error(errorMsg, {
      jobId: job.id,
      availableHandlers: Object.keys(jobHandlers),
    });
    throw new Error(errorMsg);
  }

  return handler(job);
}

/**
 * 创建趋势处理器
 */
export function createTrendingProcessor(
  concurrency: number = 1
): Worker<TrendingJobData, TrendingJobResult> {
  if (trendingWorker) {
    logger.warn("Trending processor already exists, returning existing instance");
    return trendingWorker;
  }

  trendingWorker = new Worker<TrendingJobData, TrendingJobResult>(
    QUEUE_NAMES.TRENDING,
    processTrendingJob,
    {
      connection: redisConnectionOptions,
      concurrency,
    }
  );

  trendingWorker.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed successfully`, {
      name: job.name,
      updatedCount: result.updatedCount,
      calculatedCount: result.calculatedCount,
      duration: result.duration,
    });
  });

  trendingWorker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} failed`, {
      name: job?.name,
      traceId: job?.data.traceId,
      error: error.message,
      stack: error.stack,
    });
  });

  trendingWorker.on("error", (error) => {
    logger.error("Worker error", {
      error: error.message,
      stack: error.stack,
    });
  });

  logger.info(`Trending processor started with concurrency: ${concurrency}`);

  return trendingWorker;
}

/**
 * 关闭趋势处理器
 */
export async function closeTrendingProcessor(): Promise<void> {
  if (trendingWorker) {
    await trendingWorker.close();
    trendingWorker = null;
    logger.info("Trending processor closed");
  }
}

/**
 * 获取处理器列表（用于调试和监控）
 */
export function getRegisteredTrendingHandlers(): string[] {
  return Object.keys(jobHandlers);
}
