/**
 * 任务配置工具测试
 */
import { describe, it, expect } from "vitest";
import {
  createJobId,
  createDefaultJobOptions,
  createCrawlerJobOptions,
  createTrendingJobOptions,
} from "../src/utils/job-config.js";
import { JOB_RETENTION_CONFIG, JOB_RETRY_CONFIG } from "../src/constants/index.js";

describe("Job Config", () => {
  describe("createJobId", () => {
    it("应该生成正确格式的任务 ID", () => {
      const id = createJobId("test-type", "trace-123");
      expect(id).toBe("test-type-trace-123");
    });

    it("应该处理空字符串", () => {
      const id = createJobId("", "");
      expect(id).toBe("-");
    });
  });

  describe("createDefaultJobOptions", () => {
    it("应该包含默认保留配置", () => {
      const options = createDefaultJobOptions();

      expect(options.removeOnComplete).toEqual(JOB_RETENTION_CONFIG.removeOnComplete);
      expect(options.removeOnFail).toEqual(JOB_RETENTION_CONFIG.removeOnFail);
    });

    it("应该包含默认重试配置", () => {
      const options = createDefaultJobOptions();

      expect(options.attempts).toBe(JOB_RETRY_CONFIG.attempts);
      expect(options.backoff).toEqual(JOB_RETRY_CONFIG.backoff);
    });

    it("应该允许覆盖默认配置", () => {
      const options = createDefaultJobOptions({
        attempts: 5,
      });

      expect(options.attempts).toBe(5);
      expect(options.removeOnComplete).toEqual(JOB_RETENTION_CONFIG.removeOnComplete);
    });
  });

  describe("createCrawlerJobOptions", () => {
    it("应该生成爬虫任务特定配置", () => {
      const options = createCrawlerJobOptions("category-heat", "trace-123");

      expect(options.jobId).toBe("category-heat-trace-123");
    });

    it("应该允许覆盖爬虫任务配置", () => {
      const options = createCrawlerJobOptions("category-heat", "trace-123", {
        priority: 10,
      });

      expect(options.jobId).toBe("category-heat-trace-123");
      expect(options.priority).toBe(10);
    });
  });

  describe("createTrendingJobOptions", () => {
    it("应该生成趋势任务特定配置", () => {
      const options = createTrendingJobOptions("update", "trace-456");

      expect(options.jobId).toBe("trending-update-trace-456");
    });

    it("应该正确处理 calculate 类型", () => {
      const options = createTrendingJobOptions("calculate", "trace-789");

      expect(options.jobId).toBe("trending-calculate-trace-789");
    });
  });
});
