/**
 * Redis 配置测试
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  getRedisConnection,
  closeRedisConnection,
  redisConnectionOptions,
} from "../src/queue/redis.js";

describe("Redis Configuration", () => {
  afterEach(async () => {
    await closeRedisConnection();
    // 清理环境变量
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
  });

  describe("Environment Variable Parsing", () => {
    it("应该使用默认配置当没有环境变量", () => {
      // 注意：由于模块已加载，我们无法测试初始解析
      // 但可以测试导出的配置选项格式
      expect(redisConnectionOptions).toHaveProperty("host");
      expect(redisConnectionOptions).toHaveProperty("port");
      expect(redisConnectionOptions).toHaveProperty("db");
    });

    it("应该正确配置端口为数字", () => {
      expect(typeof redisConnectionOptions.port).toBe("number");
    });

    it("应该正确配置数据库索引为数字或 null", () => {
      expect(
        typeof redisConnectionOptions.db === "number" || redisConnectionOptions.db === null
      ).toBe(true);
    });
  });

  describe("getRedisConnection", () => {
    it("应该返回单例实例", () => {
      const conn1 = getRedisConnection();
      const conn2 = getRedisConnection();

      expect(conn1).toBe(conn2);
    });

    it("应该返回有效的 Redis 连接", () => {
      const conn = getRedisConnection();

      expect(conn).toBeDefined();
      expect(typeof conn.ping).toBe("function");
    });
  });

  describe("closeRedisConnection", () => {
    it("应该关闭连接", async () => {
      getRedisConnection();
      await closeRedisConnection();

      // 关闭后可以重新创建新连接
      const newConn = getRedisConnection();
      expect(newConn).toBeDefined();
    });

    it("应该处理关闭未初始化的连接", async () => {
      await closeRedisConnection();
      // 不应该抛出错误
      await expect(closeRedisConnection()).resolves.not.toThrow();
    });
  });
});
