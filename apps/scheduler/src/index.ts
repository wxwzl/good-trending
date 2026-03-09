/**
 * Good-Trending Scheduler
 * BullMQ 任务调度系统入口
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 根据环境加载对应的 .env 文件
// 注意：开发时（pnpm run dev）run.js 已经加载了环境变量，这里不需要重复加载
// 只在生产环境（pnpm run start）或独立运行时加载
// 优先级（从低到高，后加载的覆盖先加载的）
const isProduction = process.env.NODE_ENV === "production";
const isRunByScript = process.env.RUN_BY_RUNJS === "true";

if (isProduction || !isRunByScript) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";

  const envFiles = [
    ".env", // 默认
    ".env.local", // 本地覆盖
    `.env.${appEnv}`, // 特定环境
    `.env.${appEnv}.local`, // 最高优先级
  ];

  const loadedEnvFiles: string[] = [];
  for (const envFile of envFiles) {
    const result = config({ path: resolve(__dirname, "../../../", envFile), override: true });
    if (!result.error) {
      loadedEnvFiles.push(envFile);
    }
  }

  if (loadedEnvFiles.length > 0) {
    console.log(`[scheduler] Loaded environment files: ${loadedEnvFiles.join(" -> ")}`);
  } else {
    console.log(
      "[scheduler] Warning: No environment file found, using system environment variables"
    );
  }
}

import { logger } from "./utils/logger";
import { closeRedisConnection, getRedisConnection } from "./queue/redis";
import { getCrawlerQueue, getTrendingQueue, closeQueues, getQueueStats } from "./queue";
import { createCrawlerProcessor, closeCrawlerProcessor } from "./processors/crawler.processor";
import { createTrendingProcessor, closeTrendingProcessor } from "./processors/trending.processor";
import { startScheduler, stopScheduler, getSchedulerStatus, triggerJob } from "./scheduler/index";

/**
 * 应用状态
 */
interface AppState {
  running: boolean;
  startTime: Date | null;
}

const appState: AppState = {
  running: false,
  startTime: null,
};

/**
 * 初始化应用
 */
async function initialize(): Promise<void> {
  logger.info("Initializing scheduler application...");

  // 测试 Redis 连接
  try {
    const redis = getRedisConnection();
    await redis.ping();
    logger.info("Redis connection established");
  } catch (error) {
    logger.error("Failed to connect to Redis", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // 初始化队列
  logger.info("Initializing queues...");
  getCrawlerQueue();
  getTrendingQueue();

  // 初始化处理器
  logger.info("Initializing processors...");
  createCrawlerProcessor(1);
  createTrendingProcessor(1);

  logger.info("Application initialized successfully");
}

/**
 * 启动应用
 */
async function start(): Promise<void> {
  if (appState.running) {
    logger.warn("Application is already running");
    return;
  }

  try {
    await initialize();

    // 启动调度器
    startScheduler();

    appState.running = true;
    appState.startTime = new Date();

    logger.info("Application started successfully", {
      startTime: appState.startTime.toISOString(),
    });

    // 打印调度器状态
    const status = getSchedulerStatus();
    logger.info("Scheduler status", {
      running: status.running,
      jobCount: status.jobCount,
      jobs: status.jobs,
    });
  } catch (error) {
    logger.error("Failed to start application", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * 停止应用
 */
async function stop(): Promise<void> {
  if (!appState.running) {
    logger.warn("Application is not running");
    return;
  }

  logger.info("Stopping application...");

  // 停止调度器
  stopScheduler();

  // 关闭处理器
  await closeCrawlerProcessor();
  await closeTrendingProcessor();

  // 关闭队列
  await closeQueues();

  // 关闭 Redis 连接
  await closeRedisConnection();

  appState.running = false;
  appState.startTime = null;

  logger.info("Application stopped successfully");
}

/**
 * 优雅关闭
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await stop();
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

/**
 * 获取应用状态
 */
export function getAppStatus(): {
  running: boolean;
  startTime: Date | null;
  uptime: number | null;
  queues: Awaited<ReturnType<typeof getQueueStats>> | null;
  scheduler: ReturnType<typeof getSchedulerStatus> | null;
} {
  return {
    running: appState.running,
    startTime: appState.startTime,
    uptime: appState.startTime ? Date.now() - appState.startTime.getTime() : null,
    queues: appState.running ? null : null, // 可以添加队列状态查询
    scheduler: getSchedulerStatus(),
  };
}

/**
 * 导出模块
 */
export { start, stop, triggerJob, getSchedulerStatus, getQueueStats };

/**
 * 主函数
 */
async function main(): Promise<void> {
  // 注册信号处理
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // 处理未捕获的异常
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", {
      reason: String(reason),
      promise: String(promise),
    });
  });

  // 启动应用
  try {
    await start();

    // 保持进程运行
    logger.info("Scheduler is running. Press Ctrl+C to stop.");

    // 定期打印状态
    const statusInterval = setInterval(() => {
      const status = getSchedulerStatus();
      logger.debug("Scheduler heartbeat", {
        running: status.running,
        jobCount: status.jobCount,
      });
    }, 60000); // 每分钟打印一次

    // 清理定时器
    process.on("beforeExit", () => {
      clearInterval(statusInterval);
    });
  } catch (error) {
    logger.error("Failed to start scheduler", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}
main();
