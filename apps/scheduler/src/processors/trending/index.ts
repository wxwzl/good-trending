/**
 * 趋势任务处理器入口
 * 处理趋势数据更新和计算任务
 */
import { Worker, Job } from "bullmq";
import { TrendingJobData, TrendingJobResult, QUEUE_NAMES } from "../../queue/index.js";
import { redisConnectionOptions } from "../../queue/redis.js";
import { createSchedulerLogger } from "../../utils/logger.js";
import { updateTrendingData, calculateAllTrendingScores } from "./calculator.js";
import { formatError } from "../../utils/error-handler.js";

const logger = createSchedulerLogger("trending-processor");

/**
 * 趋势处理器实例
 */
let trendingWorker: Worker<TrendingJobData, TrendingJobResult> | null = null;

/**
 * 处理趋势任务
 *
 * @param job - BullMQ 任务对象
 * @returns 任务结果
 */
async function processTrendingJob(job: Job<TrendingJobData>): Promise<TrendingJobResult> {
  const { data } = job;
  const startTime = Date.now();

  logger.info(`Processing trending job`, {
    jobId: job.id,
    type: data.type,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: TrendingJobResult = {
    updatedCount: 0,
    calculatedCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    if (data.type === "update") {
      result.updatedCount = await updateTrendingData();
    } else if (data.type === "calculate") {
      result.calculatedCount = await calculateAllTrendingScores();
    } else {
      const errorMsg = `Unknown trending job type: ${data.type}`;
      logger.error(errorMsg, {
        jobId: job.id,
        traceId: data.traceId,
      });
      throw new Error(errorMsg);
    }

    const endTime = Date.now();
    result.duration = endTime - startTime;
    result.completedAt = new Date().toISOString();

    logger.info(`Trending job completed`, {
      jobId: job.id,
      type: data.type,
      updatedCount: result.updatedCount,
      calculatedCount: result.calculatedCount,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const { message, stack } = formatError(error);

    logger.error(`Trending job failed`, {
      jobId: job.id,
      type: data.type,
      traceId: data.traceId,
      error: message,
      stack,
    });

    throw error;
  }
}

/**
 * 创建趋势处理器
 *
 * @param concurrency - 并发数，默认为 1
 * @returns Worker 实例
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

  // 事件监听
  trendingWorker.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed successfully`, {
      type: job.data.type,
      updatedCount: result.updatedCount,
      calculatedCount: result.calculatedCount,
    });
  });

  trendingWorker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} failed`, {
      type: job?.data.type,
      traceId: job?.data.traceId,
      error: error.message,
      stack: error.stack,
    });
  });

  trendingWorker.on("error", (error) => {
    logger.error(`Worker error`, {
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
