/**
 * 趋势计算任务 - 处理器
 */
import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { formatError } from "../../utils/error-handler.js";
import { calculateAllTrendingScores } from "./calculator.js";
import type { TrendingJobData, TrendingJobResult } from "../../queue/index.js";

const logger = createSchedulerLogger("trending-calculate-processor");

/**
 * 处理趋势计算任务
 */
export async function processTrendingCalculateJob(
  job: Job<TrendingJobData>
): Promise<TrendingJobResult> {
  const { data } = job;
  const startTime = Date.now();

  logger.info("Processing trending-calculate job", {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  try {
    const calculatedCount = await calculateAllTrendingScores();

    const duration = Date.now() - startTime;

    logger.info("trending-calculate job completed", {
      jobId: job.id,
      calculatedCount,
      duration,
    });

    return {
      updatedCount: 0,
      calculatedCount,
      duration,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const { message, stack } = formatError(error);

    logger.error("trending-calculate job failed", {
      jobId: job.id,
      traceId: data.traceId,
      error: message,
      stack,
    });

    throw error;
  }
}
