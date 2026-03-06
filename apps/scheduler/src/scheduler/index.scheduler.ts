/**
 * 定时任务调度器
 * 使用 node-cron 实现定时任务
 */
import { Queue } from "bullmq";
import { createSchedulerLogger } from "../utils/logger";
import {
  getCrawlerQueue,
  getTrendingQueue,
  CrawlerJobData,
  TrendingJobData,
  JOB_TYPES,
} from "../queue";

const logger = createSchedulerLogger("scheduler");

/**
 * 定时任务状态
 */
interface SchedulerState {
  running: boolean;
  jobs: Map<string, NodeJS.Timeout>;
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
 * Cron 表达式常量
 */
export const CRON_SCHEDULES = {
  /** 每小时整点执行 */
  EVERY_HOUR: "0 * * * *",
  /** 每 15 分钟执行 */
  EVERY_15_MINUTES: "*/15 * * * *",
  /** 每天凌晨 2 点执行 */
  DAILY_2AM: "0 2 * * *",
  /** 每天凌晨 3 点执行 */
  DAILY_3AM: "0 3 * * *",
  /** 每天凌晨 5 点执行 */
  DAILY_5AM: "0 5 * * *",
} as const;

/**
 * 计算下次执行延迟
 */
function getNextDelay(expression: string): number {
  const parts = expression.split(" ");

  // 处理 */X 格式（每 X 分钟）
  if (parts[0].startsWith("*/")) {
    const minutes = parseInt(parts[0].substring(2), 10);
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();

    // 计算到下一个时间点的分钟数
    const nextMinute = Math.ceil((currentMinutes + 1) / minutes) * minutes;
    const delayMinutes = nextMinute - currentMinutes;
    const delayMs = (delayMinutes * 60 - currentSeconds) * 1000;

    return delayMs;
  }

  // 处理每小时整点 "0 * * * *"
  if (parts[0] === "0" && parts[1] === "*") {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    const delayMs = (60 - currentMinutes - 1) * 60 * 1000 + (60 - currentSeconds) * 1000;
    return delayMs;
  }

  // 处理每天固定时间 "0 2 * * *"
  if (parts[0] === "0" && parts[1] !== "*" && parts[2] === "*") {
    const hour = parseInt(parts[1], 10);
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime() - now.getTime();
  }

  // 默认：每小时
  return 60 * 60 * 1000;
}

/**
 * 创建定时任务
 *
 * @param name - 任务名称
 * @param cronExpression - Cron 表达式
 * @param callback - 任务回调函数
 */
function scheduleJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
  const scheduleNext = (): void => {
    if (!state.running) {
      return;
    }

    const delay = getNextDelay(cronExpression);

    logger.debug(`Scheduling job "${name}" to run in ${delay}ms`);

    const timeout = setTimeout(async () => {
      if (!state.running) {
        return;
      }

      logger.info(`Executing scheduled job: ${name}`);

      try {
        await callback();
        logger.info(`Scheduled job "${name}" completed successfully`);
      } catch (error) {
        logger.error(`Scheduled job "${name}" failed`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      // 调度下次执行
      scheduleNext();
    }, delay);

    state.jobs.set(name, timeout);
  };

  scheduleNext();
  logger.info(`Scheduled job "${name}" with cron: ${cronExpression}`);
}

/**
 * 添加爬虫任务到队列
 */
async function scheduleCrawlJob(
  queue: Queue<CrawlerJobData>,
  source: "amazon" | "twitter"
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding ${source} crawl job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_AMAZON,
    {
      source,
      maxProducts: 20,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `${source}-${traceId}`,
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
        count: 500,
      },
    }
  );
}

/**
 * 添加趋势更新任务到队列
 */
async function scheduleTrendingJob(
  queue: Queue<TrendingJobData>,
  type: "update" | "calculate"
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding trending ${type} job to queue`, { traceId });

  await queue.add(
    type === "update" ? JOB_TYPES.UPDATE_TRENDING : JOB_TYPES.CALCULATE_TRENDING_SCORE,
    {
      type,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `trending-${type}-${traceId}`,
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
        count: 500,
      },
    }
  );
}

/**
 * 启动调度器
 *
 * @description
 * 设置以下定时任务：
 * - 每小时爬取 Amazon 商品
 * - 每小时爬取 Twitter 商品
 * - 每 15 分钟更新趋势数据
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

  // 每小时爬取 Amazon 商品
  scheduleJob("crawl-amazon", CRON_SCHEDULES.EVERY_HOUR, async () => {
    await scheduleCrawlJob(crawlerQueue, "amazon");
  });

  // 每小时爬取 Twitter 商品
  scheduleJob("crawl-twitter", CRON_SCHEDULES.EVERY_HOUR, async () => {
    await scheduleCrawlJob(crawlerQueue, "twitter");
  });

  // 每 15 分钟更新趋势数据
  scheduleJob("update-trending", CRON_SCHEDULES.EVERY_15_MINUTES, async () => {
    await scheduleTrendingJob(trendingQueue, "update");
  });

  logger.info("Scheduler started successfully");
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

  // 清除所有定时任务
  for (const [name, timeout] of state.jobs) {
    clearTimeout(timeout);
    logger.debug(`Cleared scheduled job: ${name}`);
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
 */
export async function triggerJob(jobName: string): Promise<void> {
  const crawlerQueue = getCrawlerQueue();
  const trendingQueue = getTrendingQueue();

  switch (jobName) {
    case "crawl-amazon":
      await scheduleCrawlJob(crawlerQueue, "amazon");
      break;
    case "crawl-twitter":
      await scheduleCrawlJob(crawlerQueue, "twitter");
      break;
    case "update-trending":
      await scheduleTrendingJob(trendingQueue, "update");
      break;
    case "calculate-trending":
      await scheduleTrendingJob(trendingQueue, "calculate");
      break;
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }

  logger.info(`Manually triggered job: ${jobName}`);
}
