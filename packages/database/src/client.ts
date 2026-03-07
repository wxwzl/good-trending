/**
 * 数据库连接模块
 * 使用 dotenv 显式加载环境变量，确保在模块导入时可用
 */
import { config } from "dotenv";
import { resolve } from "path";

// 根据环境加载对应的 .env 文件
// 优先级：.env.{NODE_ENV} > .env
const env = process.env.NODE_ENV || "development";
const isDev = env === "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;

config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../../.env") });
// 加载环境特定的配置文件
config({ path: resolve(__dirname, "../../../", envFile) });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * 数据库配置常量
 * 根据环境动态调整连接池大小
 */
const DB_CONFIG = {
  // 连接池配置
  MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || "20", 10),
  MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS || "5", 10),
  IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || "5000", 10),
  // 查询超时（毫秒）
  QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT || "30000", 10),
  // 是否启用查询日志（开发环境默认启用）
  ENABLE_QUERY_LOG: process.env.DB_QUERY_LOG !== "false",
};

/**
 * 获取数据库连接池
 * 延迟初始化，确保环境变量已加载
 */
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    pool = new Pool({
      connectionString,
      // 连接池大小配置
      max: DB_CONFIG.MAX_CONNECTIONS,
      min: DB_CONFIG.MIN_CONNECTIONS,
      // 超时配置
      idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT,
      connectionTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT,
      // 语句超时配置
      options: `-c statement_timeout=${DB_CONFIG.QUERY_TIMEOUT}`,
    });

    // 连接池事件监听（用于监控）
    pool.on("connect", () => {
      if (isDev && DB_CONFIG.ENABLE_QUERY_LOG) {
        console.log("[DB] New client connected to pool");
      }
    });

    pool.on("acquire", () => {
      if (isDev && DB_CONFIG.ENABLE_QUERY_LOG) {
        console.log("[DB] Client acquired from pool");
      }
    });

    pool.on("release", () => {
      if (isDev && DB_CONFIG.ENABLE_QUERY_LOG) {
        console.log("[DB] Client released back to pool");
      }
    });

    pool.on("remove", () => {
      if (isDev && DB_CONFIG.ENABLE_QUERY_LOG) {
        console.log("[DB] Client removed from pool");
      }
    });

    pool.on("error", (err) => {
      console.error("[DB] Pool error:", err.message);
    });
  }
  return pool;
}

/**
 * 获取 Drizzle 数据库实例
 * 延迟初始化，确保环境变量已加载
 * 开发环境下启用查询日志
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), {
      schema,
      // 开发环境启用查询日志
      logger: isDev && DB_CONFIG.ENABLE_QUERY_LOG,
    });
  }
  return dbInstance;
}

// 导出获取数据库实例的函数
export { getDb };

// 导出数据库配置
export { DB_CONFIG };

/**
 * 数据库实例类型
 */
type DbType = ReturnType<typeof drizzle<typeof schema>>;

/**
 * 数据库实例
 * 使用 Proxy 实现延迟初始化
 */
export const db: DbType = new Proxy({} as DbType, {
  get(_, prop) {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (db as any)[prop];
    if (typeof value === "function") {
      return value.bind(db);
    }
    return value;
  },
});

/**
 * 关闭数据库连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

/**
 * 数据库健康检查
 * 执行简单查询验证数据库连接是否正常
 *
 * @returns 健康检查结果
 */
export async function databaseHealthCheck(): Promise<{
  status: "ok" | "error";
  latency?: number;
  error?: string;
}> {
  try {
    const currentPool = getPool();
    const start = Date.now();
    const result = await currentPool.query("SELECT 1 as health_check");
    const latency = Date.now() - start;

    if (result.rows[0]?.health_check === 1) {
      return {
        status: "ok",
        latency,
      };
    }

    return {
      status: "error",
      error: "Unexpected query result",
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * 获取数据库连接池状态
 */
export function getPoolStatus(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  if (!pool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
