/**
 * BullMQ 队列定义模块
 * 定义所有任务队列及其配置
 */
import { Queue, QueueEvents, Worker } from "bullmq";
import { redisConnectionOptions } from "./redis.js";
import { JOB_RETENTION_CONFIG, JOB_RETRY_CONFIG, JOB_TIMEOUT_CONFIG } from "../constants/index.js";
import { createSchedulerLogger } from "../utils/logger.js";

const logger = createSchedulerLogger("queue");

/**
 * 队列名称常量
 * 与 shared 包中的常量保持一致
 */
export const QUEUE_NAMES = {
  /** 爬虫队列 - 处理所有爬虫任务 */
  CRAWLER: "crawler-queue",
  /** 趋势队列 - 更新趋势数据 */
  TRENDING: "trending-queue",
} as const;

/**
 * 任务类型常量
 */
export const JOB_TYPES = {
  /** Amazon 商品爬取 (旧版，已废弃) */
  CRAWL_AMAZON: "crawl-amazon",
  /** Twitter/X 商品爬取 (旧版，已废弃) */
  CRAWL_TWITTER: "crawl-twitter",
  /** 类目热度统计爬取 (新版 Google Search) */
  CRAWL_CATEGORY_HEAT: "crawl-category-heat",
  /** 商品发现爬取 (新版 Google Search) */
  CRAWL_PRODUCT_DISCOVERY: "crawl-product-discovery",
  /** 商品社交提及统计爬取 (新版 Google Search) */
  CRAWL_PRODUCT_MENTIONS: "crawl-product-mentions",
  /** 昨天数据统计爬取 (新版 Google Search) */
  CRAWL_YESTERDAY_STATS: "crawl-yesterday-stats",
  /** 趋势数据更新 */
  UPDATE_TRENDING: "update-trending",
  /** 趋势分数计算 */
  CALCULATE_TRENDING_SCORE: "calculate-trending-score",
} as const;

/**
 * 任务数据接口
 */
export interface CrawlerJobData {
  /** 爬虫类型 */
  source:
    | "amazon"
    | "twitter"
    | "category-heat"
    | "product-discovery"
    | "product-mentions"
    | "yesterday-stats";
  /** 最大商品数量 */
  maxProducts?: number;
  /** 是否使用无头模式 */
  headless?: boolean;
  /** 是否保存到数据库 */
  saveToDb?: boolean;
  /** 任务触发来源 */
  triggeredBy: "scheduler" | "manual";
  /** 任务 ID (用于日志追踪) */
  traceId: string;
}

export interface TrendingJobData {
  /** 任务类型 */
  type: "update" | "calculate";
  /** 任务触发来源 */
  triggeredBy: "scheduler" | "manual";
  /** 任务 ID (用于日志追踪) */
  traceId: string;
}

/**
 * 任务结果接口
 */
export interface CrawlerJobResult {
  /** 爬虫名称 */
  source: string;
  /** 爬取的商品数量 */
  totalProducts: number;
  /** 保存到数据库的数量 */
  savedProducts: number;
  /** 错误数量 */
  errorCount: number;
  /** 耗时 (毫秒) */
  duration: number;
  /** 完成时间 */
  completedAt: string;
}

export interface TrendingJobResult {
  /** 更新的趋势记录数量 */
  updatedCount: number;
  /** 计算的商品数量 */
  calculatedCount: number;
  /** 耗时 (毫秒) */
  duration: number;
  /** 完成时间 */
  completedAt: string;
}

/**
 * 队列实例缓存
 */
let crawlerQueue: Queue<CrawlerJobData> | null = null;
let trendingQueue: Queue<TrendingJobData> | null = null;
let crawlerQueueEvents: QueueEvents | null = null;
let trendingQueueEvents: QueueEvents | null = null;

/**
 * 默认队列配置
 * 使用常量定义，避免魔法数字
 */
const defaultQueueOptions = {
  defaultJobOptions: {
    /** 移除已完成任务的时间 */
    removeOnComplete: JOB_RETENTION_CONFIG.removeOnComplete,
    /** 移除失败任务的时间 */
    removeOnFail: JOB_RETENTION_CONFIG.removeOnFail,
    /** 任务超时时间 */
    timeout: JOB_TIMEOUT_CONFIG.default,
    /** 重试配置 */
    attempts: JOB_RETRY_CONFIG.attempts,
    backoff: JOB_RETRY_CONFIG.backoff,
  },
} as const;

/**
 * 获取爬虫队列实例
 */
export function getCrawlerQueue(): Queue<CrawlerJobData> {
  if (!crawlerQueue) {
    crawlerQueue = new Queue<CrawlerJobData>(QUEUE_NAMES.CRAWLER, {
      connection: redisConnectionOptions,
      ...defaultQueueOptions,
    });

    logger.info(`Crawler queue initialized: ${QUEUE_NAMES.CRAWLER}`);
  }

  return crawlerQueue;
}

/**
 * 获取趋势队列实例
 */
export function getTrendingQueue(): Queue<TrendingJobData> {
  if (!trendingQueue) {
    trendingQueue = new Queue<TrendingJobData>(QUEUE_NAMES.TRENDING, {
      connection: redisConnectionOptions,
      ...defaultQueueOptions,
    });

    logger.info(`Trending queue initialized: ${QUEUE_NAMES.TRENDING}`);
  }

  return trendingQueue;
}

/**
 * 获取爬虫队列事件监听器
 */
export function getCrawlerQueueEvents(): QueueEvents {
  if (!crawlerQueueEvents) {
    crawlerQueueEvents = new QueueEvents(QUEUE_NAMES.CRAWLER, {
      connection: redisConnectionOptions,
    });
  }

  return crawlerQueueEvents;
}

/**
 * 获取趋势队列事件监听器
 */
export function getTrendingQueueEvents(): QueueEvents {
  if (!trendingQueueEvents) {
    trendingQueueEvents = new QueueEvents(QUEUE_NAMES.TRENDING, {
      connection: redisConnectionOptions,
    });
  }

  return trendingQueueEvents;
}

/**
 * 关闭所有队列连接
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (crawlerQueue) {
    closePromises.push(
      crawlerQueue.close().then(() => {
        logger.info("Crawler queue closed");
        crawlerQueue = null;
      })
    );
  }

  if (trendingQueue) {
    closePromises.push(
      trendingQueue.close().then(() => {
        logger.info("Trending queue closed");
        trendingQueue = null;
      })
    );
  }

  if (crawlerQueueEvents) {
    closePromises.push(
      crawlerQueueEvents.close().then(() => {
        crawlerQueueEvents = null;
      })
    );
  }

  if (trendingQueueEvents) {
    closePromises.push(
      trendingQueueEvents.close().then(() => {
        trendingQueueEvents = null;
      })
    );
  }

  await Promise.all(closePromises);
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats() {
  const [crawlerStats, trendingStats] = await Promise.all([
    getCrawlerQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    getTrendingQueue().getJobCounts("waiting", "active", "completed", "failed", "delayed"),
  ]);

  return {
    crawler: crawlerStats,
    trending: trendingStats,
  };
}

// 导出类型
export type { Worker };
