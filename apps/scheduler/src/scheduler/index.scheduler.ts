/**
 * 定时任务调度器
 * 根据 dataStructure.md 需求实现定时任务调度
 *
 * 调度规则：
 * - 每2小时爬取今天数据（类目热度、商品发现）
 * - 每天凌晨执行昨天数据统计（完整数据爬取）
 * - 每天凌晨计算趋势榜单
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
 * 根据 dataStructure.md 需求配置
 */
export const CRON_SCHEDULES = {
  /** 每2小时执行 - 爬取今天数据 */
  EVERY_2_HOURS: "0 */2 * * *",
  /** 每天凌晨2点执行 - 完整数据爬取（昨天数据） */
  DAILY_2AM: "0 2 * * *",
  /** 每天凌晨3点执行 - 计算趋势榜单 */
  DAILY_3AM: "0 3 * * *",
  /** 每天凌晨4点执行 - Bitmap更新 */
  DAILY_4AM: "0 4 * * *",
  /** 每天凌晨5点执行 - 社交提及统计 */
  DAILY_5AM: "0 5 * * *",
  /** 每15分钟执行 - 趋势数据更新（可选） */
  EVERY_15_MINUTES: "*/15 * * * *",
} as const;

/**
 * 计算下次执行延迟（毫秒）
 */
function getNextDelay(cronExpression: string): number {
  const parts = cronExpression.split(" ");

  // 处理 */X 格式（每 X 分钟/小时）
  if (parts[0].startsWith("*/") || parts[1].startsWith("*/")) {
    const now = new Date();

    // 每 X 小时
    if (parts[1].startsWith("*/")) {
      const hours = parseInt(parts[1].substring(2), 10);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      const nextHour = Math.floor(currentHour / hours) * hours + hours;
      const delayHours = nextHour - currentHour;
      const delayMs =
        (delayHours * 60 * 60 - currentMinute * 60 - currentSecond) * 1000;

      return delayMs;
    }

    // 每 X 分钟
    if (parts[0].startsWith("*/")) {
      const minutes = parseInt(parts[0].substring(2), 10);
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();

      const nextMinute = Math.ceil((currentMinute + 1) / minutes) * minutes;
      const delayMinutes = nextMinute - currentMinute;
      const delayMs = (delayMinutes * 60 - currentSecond) * 1000;

      return delayMs;
    }
  }

  // 处理每小时整点 "0 * * * *"
  if (parts[0] === "0" && parts[1] === "*") {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    const delayMs =
      (60 - currentMinutes - 1) * 60 * 1000 + (60 - currentSeconds) * 1000;
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
 */
function scheduleJob(
  name: string,
  cronExpression: string,
  callback: () => Promise<void>
): void {
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
 * 添加类目热度爬取任务
 */
async function scheduleCategoryHeatJob(
  queue: Queue<CrawlerJobData>
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding category heat crawl job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_CATEGORY_HEAT,
    {
      source: "category-heat",
      maxProducts: 10,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `category-heat-${traceId}`,
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
 * 添加商品发现任务
 */
async function scheduleProductDiscoveryJob(
  queue: Queue<CrawlerJobData>
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding product discovery crawl job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_PRODUCT_DISCOVERY,
    {
      source: "product-discovery",
      maxProducts: 10,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `product-discovery-${traceId}`,
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
 * 添加社交提及统计任务
 */
async function scheduleProductMentionsJob(
  queue: Queue<CrawlerJobData>
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding product mentions crawl job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_PRODUCT_MENTIONS,
    {
      source: "product-mentions",
      maxProducts: 50, // 限制处理的商品数量
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `product-mentions-${traceId}`,
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
 * 添加昨天数据统计任务
 */
async function scheduleYesterdayStatsJob(queue: Queue<CrawlerJobData>): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding yesterday stats job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_YESTERDAY_STATS,
    {
      source: "yesterday-stats",
      maxProducts: 10,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `yesterday-stats-${traceId}`,
      removeOnComplete: { age: 24 * 3600, count: 100 },
      removeOnFail: { age: 7 * 24 * 3600, count: 500 },
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
    type === "update"
      ? JOB_TYPES.UPDATE_TRENDING
      : JOB_TYPES.CALCULATE_TRENDING_SCORE,
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
 * 根据 dataStructure.md 设置定时任务：
 * - 每2小时：类目热度统计、商品发现（今天数据）
 * - 每天凌晨2点：完整数据爬取（昨天数据）
 * - 每天凌晨3点：计算趋势榜单
 * - 每天凌晨4点：Bitmap更新
 * - 每天凌晨5点：社交提及统计
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

  // ========== 每2小时执行的任务（今天数据）==========

  // 每2小时执行类目热度统计
  scheduleJob("crawl-category-heat", CRON_SCHEDULES.EVERY_2_HOURS, async () => {
    await scheduleCategoryHeatJob(crawlerQueue);
  });

  // 每2小时执行商品发现
  scheduleJob(
    "crawl-product-discovery",
    CRON_SCHEDULES.EVERY_2_HOURS,
    async () => {
      await scheduleProductDiscoveryJob(crawlerQueue);
    }
  );

  // ========== 每天凌晨执行的任务（昨天完整数据）==========

  // 每天凌晨2点：昨天数据统计
  scheduleJob("crawl-yesterday-stats", CRON_SCHEDULES.DAILY_2AM, async () => {
    await scheduleYesterdayStatsJob(crawlerQueue);
  });

  // 每天凌晨3点：计算趋势榜单
  scheduleJob("calculate-trending", CRON_SCHEDULES.DAILY_3AM, async () => {
    await scheduleTrendingJob(trendingQueue, "calculate");
  });

  // 每天凌晨4点：更新趋势数据
  scheduleJob("update-trending", CRON_SCHEDULES.DAILY_4AM, async () => {
    await scheduleTrendingJob(trendingQueue, "update");
  });

  // 每天凌晨5点：社交提及统计
  scheduleJob("crawl-product-mentions", CRON_SCHEDULES.DAILY_5AM, async () => {
    await scheduleProductMentionsJob(crawlerQueue);
  });

  logger.info("Scheduler started successfully with new crawler jobs");
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
    case "crawl-category-heat":
      await scheduleCategoryHeatJob(crawlerQueue);
      break;
    case "crawl-product-discovery":
      await scheduleProductDiscoveryJob(crawlerQueue);
      break;
    case "crawl-product-mentions":
      await scheduleProductMentionsJob(crawlerQueue);
      break;
    case "crawl-yesterday-stats":
      await scheduleYesterdayStatsJob(crawlerQueue);
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
