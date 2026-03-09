/**
 * Redis 连接配置模块
 * 提供单例 Redis 连接，用于 BullMQ 队列
 */
import Redis from "ioredis";
import { createSchedulerLogger } from "../utils/logger.js";
import type { RedisConfig } from "../types/index.js";

const logger = createSchedulerLogger("redis");

/**
 * 验证 Redis 配置
 * @param config - 待验证的配置
 * @returns 验证后的配置
 * @throws 当配置无效时抛出错误
 */
function validateRedisConfig(config: Partial<RedisConfig>): RedisConfig {
  const errors: string[] = [];

  // 验证主机
  if (!config.host || config.host.trim() === "") {
    errors.push("Redis host is required");
  }

  // 验证端口
  if (config.port === undefined || config.port === null) {
    errors.push("Redis port is required");
  } else if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    errors.push(`Invalid Redis port: ${config.port}. Must be between 1 and 65535`);
  }

  // 验证数据库索引
  if (config.db !== undefined && (isNaN(config.db) || config.db < 0 || config.db > 15)) {
    errors.push(`Invalid Redis database: ${config.db}. Must be between 0 and 15`);
  }

  if (errors.length > 0) {
    throw new Error(`Redis configuration error: ${errors.join("; ")}`);
  }

  return {
    host: config.host!,
    port: config.port!,
    password: config.password,
    db: config.db ?? 0,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? null,
  };
}

/**
 * 解析 Redis URL
 * @param redisUrl - Redis URL
 * @returns 解析后的配置
 * @throws 当 URL 无效时抛出错误
 */
function parseRedisUrl(redisUrl: string): RedisConfig {
  try {
    const url = new URL(redisUrl);

    const port = parseInt(url.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${url.port}`);
    }

    const db = url.pathname ? parseInt(url.pathname.slice(1), 10) : 0;
    if (isNaN(db) || db < 0 || db > 15) {
      throw new Error(`Invalid database: ${url.pathname}`);
    }

    return validateRedisConfig({
      host: url.hostname || "localhost",
      port,
      password: url.password || undefined,
      db,
      maxRetriesPerRequest: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Redis configuration")) {
      throw error;
    }
    throw new Error(`Invalid REDIS_URL: ${redisUrl}. ${String(error)}`);
  }
}

/**
 * 从环境变量解析 Redis 配置
 * @returns 验证后的 Redis 配置
 * @throws 当配置无效时抛出错误
 */
function parseRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    logger.info("Using REDIS_URL for Redis configuration");
    return parseRedisUrl(redisUrl);
  }

  logger.info("Using individual Redis environment variables");

  const port = parseInt(process.env.REDIS_PORT || "6380", 10);
  const db = parseInt(process.env.REDIS_DB || "0", 10);

  return validateRedisConfig({
    host: process.env.REDIS_HOST || "localhost",
    port,
    password: process.env.REDIS_PASSWORD || undefined,
    db,
    maxRetriesPerRequest: null,
  });
}

const redisConfig = parseRedisConfig();

/**
 * Redis 连接单例
 * BullMQ 需要单独的 Redis 连接实例
 */
let redisConnection: Redis | null = null;

/**
 * 获取 Redis 连接实例
 * 使用单例模式确保全局只有一个连接
 *
 * @returns Redis 连接实例
 */
export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: (times: number) => {
        if (times > 10) {
          logger.error("Max retry attempts reached, giving up");
          return null;
        }
        // 指数退避重试
        const delay = Math.min(times * 1000, 5000);
        logger.warn(`Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    redisConnection.on("connect", () => {
      logger.info(`Connected to ${redisConfig.host}:${redisConfig.port}`);
    });

    redisConnection.on("error", (error) => {
      logger.error("Connection error:", { error: error.message });
    });

    redisConnection.on("close", () => {
      logger.info("Connection closed");
    });

    redisConnection.on("reconnecting", () => {
      logger.info("Reconnecting...");
    });
  }

  return redisConnection;
}

/**
 * 关闭 Redis 连接
 * 用于优雅关闭
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info("Connection closed gracefully");
  }
}

/**
 * 获取 BullMQ 兼容的连接配置
 * BullMQ 使用 IORedis 连接
 */
export function getBullMQConnection() {
  return {
    connection: getRedisConnection(),
  };
}

/**
 * 导出配置供其他模块使用
 */
export const redisConnectionOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null as null,
};
