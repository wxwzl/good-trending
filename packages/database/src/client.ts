/**
 * 数据库连接模块
 * 使用 dotenv 显式加载环境变量，确保在模块导入时可用
 */
import { config } from "dotenv";
import { resolve } from "path";

// 尝试从多个位置加载 .env 文件（在模块导入时立即执行）
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../../.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

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
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * 获取 Drizzle 数据库实例
 * 延迟初始化，确保环境变量已加载
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// 导出获取数据库实例的函数
export { getDb };

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
