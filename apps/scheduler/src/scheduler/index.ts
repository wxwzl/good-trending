/**
 * 定时任务调度器
 * 动态注册所有启用的任务，支持 crawler-queue 和 trending-queue 两条队列
 */
import { Queue } from "bullmq";
import cron, { type ScheduledTask } from "node-cron";
import { createSchedulerLogger } from "../utils/logger.js";
import { wrapScheduledJob } from "../utils/error-handler.js";
import {
  getCrawlerQueue,
  getTrendingQueue,
  CrawlerJobData,
  TrendingJobData,
} from "../queue/index.js";
import { createCrawlerJobOptions, createTrendingJobOptions } from "../utils/job-config.js";
import { getEnabledCrawlerJobs, getEnabledTrendingJobs } from "../jobs/index.js";

const logger = createSchedulerLogger("scheduler");

/**
 * 定时任务状态
 */
interface SchedulerState {
  running: boolean;
  jobs: Map<string, ScheduledTask>;
}

const state: SchedulerState = {
  running: false,
  jobs: new Map(),
};

/**
 * 生成唯一追踪 ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 验证 Cron 表达式是否有效
 */
function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * 创建定时任务
 */
function scheduleJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
  if (!validateCronExpression(cronExpression)) {
    logger.error(`Invalid cron expression for job "${name}": ${cronExpression}`);
    return;
  }

  const wrappedCallback = wrapScheduledJob(name, callback);

  const task = cron.schedule(
    cronExpression,
    async () => {
      if (!state.running) {
        return;
      }
      await wrappedCallback();
    },
    {
      timezone: "Asia/Shanghai",
    } as any
  );

  state.jobs.set(name, task);
  logger.info(`Scheduled job "${name}" with cron: ${cronExpression}`);
}

/**
 * 添加爬虫任务到 crawler-queue
 */
async function addCrawlerJobToQueue(queue: Queue<CrawlerJobData>, jobName: string): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding ${jobName} job to crawler-queue`, { traceId });

  await queue.add(
    jobName,
    {
      source: jobName as CrawlerJobData["source"],
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    createCrawlerJobOptions(jobName, traceId)
  );
}

/**
 * 添加趋势任务到 trending-queue
 */
async function addTrendingJobToQueue(
  queue: Queue<TrendingJobData>,
  jobName: string
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding ${jobName} job to trending-queue`, { traceId });

  const type = jobName === "trending-calculate" ? "calculate" : "update";

  await queue.add(
    jobName,
    {
      type,
      triggeredBy: "scheduler",
      traceId,
    },
    createTrendingJobOptions(type, traceId)
  );
}

/**
 * 启动调度器
 * 动态注册所有启用的任务
 */
export function startScheduler(): void {
  if (state.running) {
    logger.warn("Scheduler is already running");
    return;
  }

  state.running = true;
  logger.info("Starting scheduler...");

  const crawlerQueue = getCrawlerQueue();
  const trendingQueue = getTrendingQueue();

  // 注册爬虫队列任务
  const enabledCrawlerJobs = getEnabledCrawlerJobs();
  for (const job of enabledCrawlerJobs) {
    scheduleJob(job.name, job.cron, async () => {
      await addCrawlerJobToQueue(crawlerQueue, job.name);
    });
  }

  // 注册趋势队列任务
  const enabledTrendingJobs = getEnabledTrendingJobs();
  for (const job of enabledTrendingJobs) {
    scheduleJob(job.name, job.cron, async () => {
      await addTrendingJobToQueue(trendingQueue, job.name);
    });
  }

  logger.info(
    `Scheduler started with ${enabledCrawlerJobs.length} crawler jobs and ${enabledTrendingJobs.length} trending jobs`
  );
}

/**
 * 停止调度器
 */
export function stopScheduler(): void {
  if (!state.running) {
    logger.warn("Scheduler is not running");
    return;
  }

  state.running = false;

  for (const [name, task] of state.jobs) {
    task.stop();
    logger.debug(`Stopped scheduled job: ${name}`);
  }
  state.jobs.clear();

  logger.info("Scheduler stopped");
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  running: boolean;
  jobCount: number;
  jobs: string[];
} {
  return {
    running: state.running,
    jobCount: state.jobs.size,
    jobs: Array.from(state.jobs.keys()),
  };
}

/**
 * 手动触发任务（用于测试或手动执行）
 *
 * @param jobName - 任务名称
 * @throws 当任务名称未知时抛出错误
 */
export async function triggerJob(jobName: string): Promise<void> {
  const crawlerQueue = getCrawlerQueue();
  const trendingQueue = getTrendingQueue();

  // 检查是否是爬虫任务
  const enabledCrawlerJobs = getEnabledCrawlerJobs();
  const crawlerJob = enabledCrawlerJobs.find((j) => j.name === jobName);
  if (crawlerJob) {
    await addCrawlerJobToQueue(crawlerQueue, jobName);
    logger.info(`Manually triggered crawler job: ${jobName}`);
    return;
  }

  // 检查是否是趋势任务
  const enabledTrendingJobs = getEnabledTrendingJobs();
  const trendingJob = enabledTrendingJobs.find((j) => j.name === jobName);
  if (trendingJob) {
    await addTrendingJobToQueue(trendingQueue, jobName);
    logger.info(`Manually triggered trending job: ${jobName}`);
    return;
  }

  // 未知任务
  const errorMsg = `Unknown job: ${jobName}`;
  logger.error(errorMsg, {
    availableCrawlerJobs: enabledCrawlerJobs.map((j) => j.name),
    availableTrendingJobs: enabledTrendingJobs.map((j) => j.name),
  });
  throw new Error(errorMsg);
}
