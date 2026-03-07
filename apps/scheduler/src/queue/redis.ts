/**
 * Redis 连接配置模块
 * 提供单例 Redis 连接，用于 BullMQ 队列
 */
import { config } from "dotenv";
import { resolve } from "path";
import Redis from "ioredis";

// 根据环境加载对应的 .env 文件
// 优先级：.env.{NODE_ENV} > .env
const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;
config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../../../", envFile) });

/**
 * Redis 连接配置
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: number | null;
}

/**
 * 从环境变量解析 Redis 配置
 */
function parseRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // 解析 Redis URL: redis://[:password@]host:port[/db]
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
      maxRetriesPerRequest: null,
    };
  }

  // 默认配置（开发环境）
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    maxRetriesPerRequest: null,
  };
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
          console.error("[Redis] Max retry attempts reached, giving up");
          return null;
        }
        // 指数退避重试
        const delay = Math.min(times * 1000, 5000);
        console.log("[Redis] Retrying connection in " + delay + "ms (attempt " + times + ")");
        return delay;
      },
    });

    redisConnection.on("connect", () => {
      console.log("[Redis] Connected to " + redisConfig.host + ":" + redisConfig.port);
    });

    redisConnection.on("error", (error) => {
      console.error("[Redis] Connection error:", error.message);
    });

    redisConnection.on("close", () => {
      console.log("[Redis] Connection closed");
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
    console.log("[Redis] Connection closed gracefully");
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
