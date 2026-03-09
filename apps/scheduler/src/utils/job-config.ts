/**
 * 任务配置工具
 * 提供统一的任务配置生成函数
 */
import type { JobsOptions } from "bullmq";
import { JOB_RETENTION_CONFIG, JOB_RETRY_CONFIG } from "../constants/index.js";

/**
 * 扩展的 JobsOptions 类型，包含 timeout
 */
interface ExtendedJobsOptions extends JobsOptions {
  timeout?: number;
}

/**
 * 生成任务 ID
 * @param type - 任务类型
 * @param traceId - 追踪 ID
 * @returns 任务 ID
 */
export function createJobId(type: string, traceId: string): string {
  return `${type}-${traceId}`;
}

/**
 * 生成默认任务选项
 * @param overrides - 覆盖选项
 * @returns 任务选项
 */
export function createDefaultJobOptions(
  overrides?: Partial<ExtendedJobsOptions>
): ExtendedJobsOptions {
  return {
    removeOnComplete: JOB_RETENTION_CONFIG.removeOnComplete,
    removeOnFail: JOB_RETENTION_CONFIG.removeOnFail,
    attempts: JOB_RETRY_CONFIG.attempts,
    backoff: JOB_RETRY_CONFIG.backoff,
    ...overrides,
  };
}

/**
 * 生成爬虫任务选项
 * @param type - 任务类型
 * @param traceId - 追踪 ID
 * @param overrides - 覆盖选项
 * @returns 任务选项
 */
export function createCrawlerJobOptions(
  type: string,
  traceId: string,
  overrides?: Partial<ExtendedJobsOptions>
): ExtendedJobsOptions {
  return createDefaultJobOptions({
    jobId: createJobId(type, traceId),
    ...overrides,
  });
}

/**
 * 生成趋势任务选项
 * @param type - 任务类型 (update/calculate)
 * @param traceId - 追踪 ID
 * @param overrides - 覆盖选项
 * @returns 任务选项
 */
export function createTrendingJobOptions(
  type: string,
  traceId: string,
  overrides?: Partial<ExtendedJobsOptions>
): ExtendedJobsOptions {
  return createDefaultJobOptions({
    jobId: createJobId(`trending-${type}`, traceId),
    ...overrides,
  });
}
