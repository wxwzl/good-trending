/**
 * 常量测试
 */
import { describe, it, expect } from "vitest";
import {
  JOB_RETENTION_CONFIG,
  JOB_TIMEOUT_CONFIG,
  JOB_RETRY_CONFIG,
  CRAWLER_CONFIG,
  TRENDING_CONFIG,
  PERIOD_TYPES,
  CRON_SCHEDULES,
} from "../src/constants/index.js";

describe("Constants", () => {
  describe("JOB_RETENTION_CONFIG", () => {
    it("应该正确配置已完成任务保留策略", () => {
      expect(JOB_RETENTION_CONFIG.removeOnComplete.age).toBe(24 * 60 * 60);
      expect(JOB_RETENTION_CONFIG.removeOnComplete.count).toBe(100);
    });

    it("应该正确配置失败任务保留策略", () => {
      expect(JOB_RETENTION_CONFIG.removeOnFail.age).toBe(7 * 24 * 60 * 60);
      expect(JOB_RETENTION_CONFIG.removeOnFail.count).toBe(500);
    });
  });

  describe("JOB_TIMEOUT_CONFIG", () => {
    it("应该正确配置默认超时", () => {
      expect(JOB_TIMEOUT_CONFIG.default).toBe(30 * 60 * 1000);
    });

    it("应该正确配置爬虫任务超时", () => {
      expect(JOB_TIMEOUT_CONFIG.crawler).toBe(60 * 60 * 1000);
    });

    it("应该正确配置趋势任务超时", () => {
      expect(JOB_TIMEOUT_CONFIG.trending).toBe(20 * 60 * 1000);
    });
  });

  describe("JOB_RETRY_CONFIG", () => {
    it("应该正确配置重试次数", () => {
      expect(JOB_RETRY_CONFIG.attempts).toBe(3);
    });

    it("应该正确配置退避策略", () => {
      expect(JOB_RETRY_CONFIG.backoff.type).toBe("exponential");
      expect(JOB_RETRY_CONFIG.backoff.delay).toBe(60 * 1000);
    });
  });

  describe("CRAWLER_CONFIG", () => {
    it("应该正确配置浏览器超时", () => {
      expect(CRAWLER_CONFIG.BROWSER_TIMEOUT).toBe(60000);
    });

    it("应该正确配置类目热度参数", () => {
      expect(CRAWLER_CONFIG.CATEGORY_HEAT.MAX_RESULTS_PER_CATEGORY).toBe(10);
      expect(CRAWLER_CONFIG.CATEGORY_HEAT.SEARCH_DELAY_MIN).toBe(3000);
      expect(CRAWLER_CONFIG.CATEGORY_HEAT.SEARCH_DELAY_MAX).toBe(6000);
    });

    it("应该正确配置商品发现参数", () => {
      expect(CRAWLER_CONFIG.PRODUCT_DISCOVERY.MAX_RESULTS_PER_CATEGORY).toBe(30);
      expect(CRAWLER_CONFIG.PRODUCT_DISCOVERY.DEFAULT_MAX_PRODUCTS).toBe(10);
    });

    it("应该正确配置提及统计参数", () => {
      expect(CRAWLER_CONFIG.MENTIONS.DEFAULT_MAX_PRODUCTS).toBe(50);
      expect(CRAWLER_CONFIG.MENTIONS.BATCH_SIZE).toBe(10);
      expect(CRAWLER_CONFIG.MENTIONS.BATCH_DELAY_MS).toBe(5000);
    });

    it("应该正确配置 Worker 限流", () => {
      expect(CRAWLER_CONFIG.WORKER_LIMITER.MAX).toBe(1);
      expect(CRAWLER_CONFIG.WORKER_LIMITER.DURATION_MS).toBe(60000);
    });
  });

  describe("TRENDING_CONFIG", () => {
    it("应该正确配置榜单最大商品数", () => {
      expect(TRENDING_CONFIG.MAX_RANKS).toBe(2000);
    });

    it("应该正确配置批量插入大小", () => {
      expect(TRENDING_CONFIG.BATCH_SIZE).toBe(500);
    });

    it("应该正确配置权重参数", () => {
      expect(TRENDING_CONFIG.X_MENTION_WEIGHT).toBe(0.8);
      expect(TRENDING_CONFIG.TIME_DECAY_MAX_DAYS).toBe(60);
      expect(TRENDING_CONFIG.TIME_DECAY_MIN_FACTOR).toBe(0.5);
    });
  });

  describe("PERIOD_TYPES", () => {
    it("应该包含所有周期类型", () => {
      expect(PERIOD_TYPES).toContain("TODAY");
      expect(PERIOD_TYPES).toContain("YESTERDAY");
      expect(PERIOD_TYPES).toContain("THIS_WEEK");
      expect(PERIOD_TYPES).toContain("THIS_MONTH");
      expect(PERIOD_TYPES).toContain("LAST_7_DAYS");
      expect(PERIOD_TYPES).toContain("LAST_15_DAYS");
      expect(PERIOD_TYPES).toContain("LAST_30_DAYS");
      expect(PERIOD_TYPES).toContain("LAST_60_DAYS");
    });

    it("应该有正确的长度", () => {
      expect(PERIOD_TYPES.length).toBe(8);
    });
  });

  describe("CRON_SCHEDULES", () => {
    it("应该正确配置每2小时调度", () => {
      expect(CRON_SCHEDULES.EVERY_2_HOURS).toBe("0 */2 * * *");
    });

    it("应该正确配置每天凌晨调度", () => {
      expect(CRON_SCHEDULES.DAILY_2AM).toBe("0 2 * * *");
      expect(CRON_SCHEDULES.DAILY_3AM).toBe("0 3 * * *");
      expect(CRON_SCHEDULES.DAILY_4AM).toBe("0 4 * * *");
      expect(CRON_SCHEDULES.DAILY_5AM).toBe("0 5 * * *");
    });

    it("应该正确配置每15分钟调度", () => {
      expect(CRON_SCHEDULES.EVERY_15_MINUTES).toBe("*/15 * * * *");
    });
  });
});
