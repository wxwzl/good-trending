/**
 * 趋势更新任务 - 处理器
 */
import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { formatError } from "../../utils/error-handler.js";
import { updateTrendingData } from "./updater.js";
import type { TrendingJobData, TrendingJobResult } from "../../queue/index.js";

const logger = createSchedulerLogger("trending-update-processor");

/**
 * 处理趋势更新任务
 */
export async function processTrendingUpdateJob(
  job: Job<TrendingJobData>
): Promise<TrendingJobResult> {
  const { data } = job;
  const startTime = Date.now();

  logger.info("Processing trending-update job", {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  try {
    const updatedCount = await updateTrendingData();

    const duration = Date.now() - startTime;

    logger.info("trending-update job completed", {
      jobId: job.id,
      updatedCount,
      duration,
    });

    return {
      updatedCount,
      calculatedCount: 0,
      duration,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const { message, stack } = formatError(error);

    logger.error("trending-update job failed", {
      jobId: job.id,
      traceId: data.traceId,
      error: message,
      stack,
    });

    throw error;
  }
}
