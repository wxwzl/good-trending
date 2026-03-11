/**
 * 调度器测试
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerJob,
} from "../src/scheduler/index.js";
import { CRON_SCHEDULES } from "../src/constants/index.js";

describe("Scheduler", () => {
  beforeEach(() => {
    // 确保调度器处于停止状态
    stopScheduler();
  });

  afterEach(() => {
    // 清理
    stopScheduler();
  });

  describe("startScheduler", () => {
    it("应该启动调度器", () => {
      startScheduler();

      const status = getSchedulerStatus();
      expect(status.running).toBe(true);
    });

    it("应该正确配置定时任务", () => {
      startScheduler();

      const status = getSchedulerStatus();
      expect(status.jobCount).toBeGreaterThan(0);
      expect(status.jobs.length).toBeGreaterThan(0);
    });

    it("应该防止重复启动", () => {
      startScheduler();
      startScheduler(); // 第二次启动应该不会报错

      const status = getSchedulerStatus();
      expect(status.running).toBe(true);
    });
  });

  describe("stopScheduler", () => {
    it("应该停止调度器", () => {
      startScheduler();
      stopScheduler();

      const status = getSchedulerStatus();
      expect(status.running).toBe(false);
      expect(status.jobCount).toBe(0);
    });

    it("应该处理停止未运行的调度器", () => {
      // 不应该抛出错误
      expect(() => stopScheduler()).not.toThrow();
    });
  });

  describe("getSchedulerStatus", () => {
    it("应该返回正确的初始状态", () => {
      const status = getSchedulerStatus();

      expect(status.running).toBe(false);
      expect(status.jobCount).toBe(0);
      expect(status.jobs).toEqual([]);
    });

    it("应该返回正确的运行状态", () => {
      startScheduler();
      const status = getSchedulerStatus();

      expect(status.running).toBe(true);
      expect(status.jobs).toContain("category-heat");
      expect(status.jobs).toContain("product-discovery");
    });
  });

  describe("triggerJob", () => {
    it("应该抛出错误当任务名称未知", async () => {
      await expect(triggerJob("unknown-job")).rejects.toThrow("Unknown job");
    });

    it("应该接受已知的任务名称", async () => {
      // 这些不应该抛出错误
      const validJobs = [
        "crawl-category-heat",
        "crawl-product-discovery",
        "crawl-product-mentions",
        "crawl-yesterday-stats",
        "update-trending",
        "calculate-trending",
      ];

      for (const jobName of validJobs) {
        // 注意：由于这些任务会尝试连接队列，
        // 实际测试中可能需要 mock 队列
        expect(() => triggerJob(jobName)).not.toThrow("Unknown job");
      }
    });
  });

  describe("CRON_SCHEDULES", () => {
    it("应该使用正确的 CRON 表达式", () => {
      // 验证 CRON 表达式格式
      const cronRegex = /^[\d*,/-]+ [\d*,/-]+ [\d*,/-]+ [\d*,/-]+ [\d*,/-]+$/;

      Object.entries(CRON_SCHEDULES).forEach(([_name, expression]) => {
        expect(expression).toMatch(cronRegex);
      });
    });
  });
});
