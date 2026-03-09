/**
 * 错误处理工具
 * 提供统一的错误处理函数
 */
import { Job } from "bullmq";
import { CrawlerJobData, CrawlerJobResult } from "../queue/index.js";
import { createSchedulerLogger } from "./logger.js";
import type { CrawlerInstance } from "../types/index.js";

const logger = createSchedulerLogger("error-handler");

/**
 * 格式化错误信息
 * @param error - 错误对象
 * @returns 格式化后的错误信息
 */
export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

/**
 * 处理爬虫任务错误
 * 统一处理爬虫任务中的错误
 *
 * @param job - BullMQ 任务对象
 * @param error - 错误对象
 * @param result - 任务结果对象（会被修改）
 * @param startTime - 任务开始时间
 * @param jobName - 任务名称（用于日志）
 * @returns 格式化后的错误信息
 */
export function handleCrawlerError(
  job: Job<CrawlerJobData>,
  error: unknown,
  result: CrawlerJobResult,
  startTime: Date,
  jobName: string
): { errorMessage: string; errorStack?: string } {
  const { message: errorMessage, stack: errorStack } = formatError(error);

  logger.error(`${jobName} job failed`, {
    jobId: job.id,
    traceId: job.data.traceId,
    triggeredBy: job.data.triggeredBy,
    error: errorMessage,
    stack: errorStack,
  });

  result.errorCount = 1;
  const endTime = new Date();
  result.duration = endTime.getTime() - startTime.getTime();
  result.completedAt = endTime.toISOString();

  return { errorMessage, errorStack };
}

/**
 * 安全关闭爬虫浏览器
 *
 * @param crawler - 爬虫实例
 */
export async function safeCloseBrowser(crawler: CrawlerInstance | null): Promise<void> {
  if (crawler && typeof crawler.closeBrowser === "function") {
    try {
      await crawler.closeBrowser();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to close browser: ${errorMsg}`);
    }
  }
}

/**
 * 安全执行异步操作
 * 捕获错误但不抛出
 *
 * @param operation - 异步操作
 * @param errorContext - 错误上下文
 * @returns 是否成功
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const { message } = formatError(error);
    logger.error(`${errorContext} failed`, { error: message });
    return { success: false, error: message };
  }
}

/**
 * 包装定时任务回调
 * 提供统一的错误处理和日志
 *
 * @param name - 任务名称
 * @param callback - 任务回调
 * @returns 包装后的回调
 */
export function wrapScheduledJob(name: string, callback: () => Promise<void>): () => Promise<void> {
  return async () => {
    logger.info(`Executing scheduled job: ${name}`);

    try {
      await callback();
      logger.info(`Scheduled job "${name}" completed successfully`);
    } catch (error) {
      const { message, stack } = formatError(error);
      logger.error(`Scheduled job "${name}" failed`, {
        error: message,
        stack,
      });
    }
  };
}
