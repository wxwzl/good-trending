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

  const envFiles = [".env", ".env.local", `.env.${appEnv}`, `.env.${appEnv}.local`];

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

import { logger } from "./utils/logger.js";
import { closeRedisConnection, getRedisConnection } from "./queue/redis.js";
import { getCrawlerQueue, getTrendingQueue, closeQueues, getQueueStats } from "./queue/index.js";
import { createCrawlerProcessor, closeCrawlerProcessor } from "./processors/index.js";
import { createTrendingProcessor, closeTrendingProcessor } from "./processors/index.js";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerJob,
} from "./scheduler/index.js";
import { formatError } from "./utils/error-handler.js";
import type { AppState } from "./types/index.js";

/**
 * 应用状态
 */
const appState: AppState = {
  running: false,
  startTime: null,
};

/**
 * 心跳定时器
 */
let heartbeatInterval: NodeJS.Timeout | null = null;

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
    const { message } = formatError(error);
    logger.error("Failed to connect to Redis", { error: message });
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
    const { message, stack } = formatError(error);
    logger.error("Failed to start application", { error: message, stack });
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

  // 停止心跳定时器
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

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
    const { message } = formatError(error);
    logger.error("Error during graceful shutdown", { error: message });
    process.exit(1);
  }
}

/**
 * 设置心跳定时器
 */
function setupHeartbeat(): void {
  if (heartbeatInterval) {
    return;
  }

  heartbeatInterval = setInterval(() => {
    const status = getSchedulerStatus();
    logger.debug("Scheduler heartbeat", {
      running: status.running,
      jobCount: status.jobCount,
    });
  }, 60000); // 每分钟打印一次
}

/**
 * 清理资源
 */
function cleanup(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * 获取应用状态
 */
export async function getAppStatus(): Promise<{
  running: boolean;
  startTime: Date | null;
  uptime: number | null;
  queues: Awaited<ReturnType<typeof getQueueStats>> | null;
  scheduler: ReturnType<typeof getSchedulerStatus> | null;
}> {
  let queueStats: Awaited<ReturnType<typeof getQueueStats>> | null = null;

  if (appState.running) {
    try {
      queueStats = await getQueueStats();
    } catch (error) {
      const { message } = formatError(error);
      logger.error("Failed to get queue stats", { error: message });
    }
  }

  return {
    running: appState.running,
    startTime: appState.startTime,
    uptime: appState.startTime ? Date.now() - appState.startTime.getTime() : null,
    queues: queueStats,
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
    const { message, stack } = formatError(error);
    logger.error("Uncaught exception", { error: message, stack });
    void gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", {
      reason: String(reason),
      promise: String(promise),
    });
  });

  // 清理资源
  process.on("beforeExit", cleanup);

  // 启动应用
  try {
    await start();

    logger.info("Scheduler is running. Press Ctrl+C to stop.");

    setupHeartbeat();
  } catch (error) {
    const { message, stack } = formatError(error);
    logger.error("Failed to start scheduler", { error: message, stack });
    process.exit(1);
  }
}

main();
