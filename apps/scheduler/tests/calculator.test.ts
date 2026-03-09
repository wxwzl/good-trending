/**
 * 趋势计算器测试
 */
import { describe, it, expect } from "vitest";
import {
  calculateTrendingScore,
  getSocialCountsByPeriod,
} from "../src/processors/trending/calculator.js";
import type { PeriodType } from "../src/types/index.js";

describe("Trending Calculator", () => {
  describe("calculateTrendingScore", () => {
    it("应该正确计算基础分数", () => {
      const createdAt = new Date();
      const score = calculateTrendingScore(100, 50, createdAt);

      // 100 + 50 * 0.8 = 140
      expect(score).toBe(140);
    });

    it("应该正确应用时间衰减", () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const score = calculateTrendingScore(100, 0, thirtyDaysAgo);

      // 基础分数 100，30 天衰减后：100 * (1 - 30/60) = 100 * 0.5 = 50
      expect(score).toBe(50);
    });

    it("应该限制最低衰减因子", () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const score = calculateTrendingScore(100, 0, ninetyDaysAgo);

      // 超过 60 天，衰减因子应该限制在 0.5
      // 100 * 0.5 = 50
      expect(score).toBe(50);
    });

    it("应该确保分数非负", () => {
      const createdAt = new Date();
      const score = calculateTrendingScore(0, 0, createdAt);

      expect(score).toBe(0);
    });

    it("应该正确处理 X 平台权重", () => {
      const createdAt = new Date();
      const score = calculateTrendingScore(0, 100, createdAt);

      // 0 + 100 * 0.8 = 80
      expect(score).toBe(80);
    });
  });

  describe("getSocialCountsByPeriod", () => {
    const mockStat = {
      todayRedditCount: 10,
      todayXCount: 20,
      yesterdayRedditCount: 15,
      yesterdayXCount: 25,
      thisWeekRedditCount: 100,
      thisWeekXCount: 200,
      thisMonthRedditCount: 500,
      thisMonthXCount: 1000,
      last7DaysRedditCount: 300,
      last7DaysXCount: 600,
      last15DaysRedditCount: 400,
      last15DaysXCount: 800,
      last30DaysRedditCount: 450,
      last30DaysXCount: 900,
      last60DaysRedditCount: 480,
      last60DaysXCount: 950,
    };

    it("应该返回今日数据", () => {
      const result = getSocialCountsByPeriod("TODAY" as PeriodType, mockStat as any);

      expect(result.redditCount).toBe(10);
      expect(result.xCount).toBe(20);
    });

    it("应该返回昨日数据", () => {
      const result = getSocialCountsByPeriod("YESTERDAY" as PeriodType, mockStat as any);

      expect(result.redditCount).toBe(15);
      expect(result.xCount).toBe(25);
    });

    it("应该返回本周数据", () => {
      const result = getSocialCountsByPeriod("THIS_WEEK" as PeriodType, mockStat as any);

      expect(result.redditCount).toBe(100);
      expect(result.xCount).toBe(200);
    });

    it("应该返回默认数据当周期未知", () => {
      const result = getSocialCountsByPeriod("UNKNOWN" as PeriodType, mockStat as any);

      expect(result.redditCount).toBe(10);
      expect(result.xCount).toBe(20);
    });
  });
});
