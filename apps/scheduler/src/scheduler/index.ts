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
import { createSchedulerLogger } from "../utils/logger.js";
import { wrapScheduledJob } from "../utils/error-handler.js";
import {
  getCrawlerQueue,
  getTrendingQueue,
  CrawlerJobData,
  TrendingJobData,
  JOB_TYPES,
} from "../queue/index.js";
import { createCrawlerJobOptions, createTrendingJobOptions } from "../utils/job-config.js";
import { CRON_SCHEDULES } from "../constants/index.js";
import { getEnabledJobs } from "../jobs/index.js";

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
 * @returns 追踪 ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 验证 Cron 表达式是否有效
 * @param expression - Cron 表达式
 * @returns 是否有效
 */
function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * 创建定时任务
 *
 * @param name - 任务名称
 * @param cronExpression - Cron 表达式
 * @param callback - 任务回调
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
 * 添加爬虫任务到队列
 *
 * @param queue - 爬虫队列
 * @param source - 爬虫来源
 * @param options - 可选配置
 */
async function addCrawlerJob(
  queue: Queue<CrawlerJobData>,
  source: "category-heat" | "product-discovery" | "product-mentions" | "yesterday-stats",
  options: {
    maxProducts?: number;
  } = {}
): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding ${source} crawl job to queue`, { traceId });

  const jobTypeMap = {
    "category-heat": JOB_TYPES.CRAWL_CATEGORY_HEAT,
    "product-discovery": JOB_TYPES.CRAWL_PRODUCT_DISCOVERY,
    "product-mentions": JOB_TYPES.CRAWL_PRODUCT_MENTIONS,
    "yesterday-stats": JOB_TYPES.CRAWL_YESTERDAY_STATS,
  };

  await queue.add(
    jobTypeMap[source],
    {
      source,
      maxProducts: options.maxProducts,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    createCrawlerJobOptions(source, traceId)
  );
}

/**
 * 添加任务到队列（新架构）
 *
 * @param queue - 队列实例
 * @param jobName - 任务名称
 */
async function addJobToQueue(queue: Queue<CrawlerJobData>, jobName: string): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding ${jobName} job to queue`, { traceId });

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
 * 添加趋势任务到队列
 *
 * @param queue - 趋势队列
 * @param type - 任务类型
 */
async function addTrendingJob(
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
    createTrendingJobOptions(type, traceId)
  );
}

/**
 * 启动调度器
 *
 * 动态注册所有启用的任务（从 jobs/index.ts）
 */
export function startScheduler(): void {
  if (state.running) {
    logger.warn("Scheduler is already running");
    return;
  }

  state.running = true;
  logger.info("Starting scheduler...");

  const crawlerQueue = getCrawlerQueue();

  // 获取所有启用的任务
  const enabledJobs = getEnabledJobs();

  // 注册每个任务
  for (const job of enabledJobs) {
    scheduleJob(job.name, job.cron, async () => {
      await addJobToQueue(crawlerQueue, job.name);
    });
  }

  // 保留原有的趋势任务（暂未迁移到新架构）
  const trendingQueue = getTrendingQueue();
  scheduleJob("calculate-trending", CRON_SCHEDULES.DAILY_3AM, async () => {
    await addTrendingJob(trendingQueue, "calculate");
  });

  scheduleJob("update-trending", CRON_SCHEDULES.DAILY_4AM, async () => {
    await addTrendingJob(trendingQueue, "update");
  });

  logger.info(`Scheduler started with ${enabledJobs.length} jobs from new architecture`);
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
 *
 * @param jobName - 任务名称
 * @throws 当任务名称未知时抛出错误
 */
export async function triggerJob(jobName: string): Promise<void> {
  const crawlerQueue = getCrawlerQueue();
  const trendingQueue = getTrendingQueue();

  // 旧架构任务
  const legacyJobActions: Record<string, () => Promise<void>> = {
    "crawl-category-heat": () => addCrawlerJob(crawlerQueue, "category-heat"),
    "crawl-product-discovery": () => addCrawlerJob(crawlerQueue, "product-discovery"),
    "crawl-product-mentions": () =>
      addCrawlerJob(crawlerQueue, "product-mentions", { maxProducts: 50 }),
    "crawl-yesterday-stats": () => addCrawlerJob(crawlerQueue, "yesterday-stats"),
    "update-trending": () => addTrendingJob(trendingQueue, "update"),
    "calculate-trending": () => addTrendingJob(trendingQueue, "calculate"),
  };

  // 检查是否是旧架构任务
  const legacyAction = legacyJobActions[jobName];
  if (legacyAction) {
    await legacyAction();
    logger.info(`Manually triggered legacy job: ${jobName}`);
    return;
  }

  // 检查是否是新架构任务
  const enabledJobs = getEnabledJobs();
  const newJob = enabledJobs.find((j) => j.name === jobName);

  if (newJob) {
    await addJobToQueue(crawlerQueue, jobName);
    logger.info(`Manually triggered new job: ${jobName}`);
    return;
  }

  // 未知任务
  const errorMsg = `Unknown job: ${jobName}`;
  logger.error(errorMsg, {
    availableLegacyJobs: Object.keys(legacyJobActions),
    availableNewJobs: enabledJobs.map((j) => j.name),
  });
  throw new Error(errorMsg);
}
