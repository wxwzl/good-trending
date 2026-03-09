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
import cron, { type ScheduledTask } from "node-cron";
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
 * 验证 Cron 表达式是否有效
 */
function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * 创建定时任务
 * 使用 node-cron 库支持完整的 Cron 表达式
 */
function scheduleJob(name: string, cronExpression: string, callback: () => Promise<void>): void {
  if (!validateCronExpression(cronExpression)) {
    logger.error(`Invalid cron expression for job "${name}": ${cronExpression}`);
    return;
  }

  // 创建定时任务
  const task = cron.schedule(
    cronExpression,
    async () => {
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
    },
    {
      timezone: "Asia/Shanghai", // 使用中国时区
    } as any
  );

  state.jobs.set(name, task);
  logger.info(`Scheduled job "${name}" with cron: ${cronExpression}`);
}

/**
 * 添加类目热度爬取任务
 */
async function scheduleCategoryHeatJob(queue: Queue<CrawlerJobData>): Promise<void> {
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
async function scheduleProductDiscoveryJob(queue: Queue<CrawlerJobData>): Promise<void> {
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
async function scheduleProductMentionsJob(queue: Queue<CrawlerJobData>): Promise<void> {
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
  scheduleJob("crawl-product-discovery", CRON_SCHEDULES.EVERY_2_HOURS, async () => {
    await scheduleProductDiscoveryJob(crawlerQueue);
  });

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

  // 停止所有定时任务
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
