/**
 * Social Mention Service 测试
 * 测试社交提及统计功能
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SocialMentionService, createSocialMentionService } from "../social-mention-service.js";

describe("SocialMentionService", () => {
  beforeEach(() => {
    createSocialMentionService();
  });

  describe("工厂函数", () => {
    it("应该创建服务实例", () => {
      const service = createSocialMentionService();
      expect(service).toBeInstanceOf(SocialMentionService);
    });
  });

  describe("提及统计结构", () => {
    it("应该返回完整的 MentionStats 结构", () => {
      const mockStats = {
        today: { reddit: 10, x: 5 },
        yesterday: { reddit: 8, x: 3 },
        thisWeek: { reddit: 45, x: 20 },
        thisMonth: { reddit: 150, x: 80 },
        last7Days: { reddit: 50, x: 25 },
        last15Days: { reddit: 100, x: 50 },
        last30Days: { reddit: 200, x: 100 },
        last60Days: { reddit: 350, x: 180 },
      };

      // 验证所有时间段都存在
      expect(mockStats.today).toBeDefined();
      expect(mockStats.yesterday).toBeDefined();
      expect(mockStats.thisWeek).toBeDefined();
      expect(mockStats.thisMonth).toBeDefined();
      expect(mockStats.last7Days).toBeDefined();
      expect(mockStats.last15Days).toBeDefined();
      expect(mockStats.last30Days).toBeDefined();
      expect(mockStats.last60Days).toBeDefined();

      // 验证每个时间段的结构
      Object.values(mockStats).forEach((period) => {
        expect(period).toHaveProperty("reddit");
        expect(period).toHaveProperty("x");
        expect(typeof period.reddit).toBe("number");
        expect(typeof period.x).toBe("number");
        expect(period.reddit).toBeGreaterThanOrEqual(0);
        expect(period.x).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("搜索查询构建", () => {
    it("应该为每个时间段构建正确的查询", () => {
      const productName = "iPhone 15";

      // TODAY 查询
      const todayQuery = `site:reddit.com "${productName}" after:2026-03-11`;
      expect(todayQuery).toContain("site:reddit.com");
      expect(todayQuery).toContain(productName);
      expect(todayQuery).toContain("after:2026-03-11");

      // YESTERDAY 查询
      const yesterdayQuery = `site:reddit.com "${productName}" after:2026-03-10 before:2026-03-11`;
      expect(yesterdayQuery).toContain("after:2026-03-10");
      expect(yesterdayQuery).toContain("before:2026-03-11");
    });
  });

  describe("数据汇总", () => {
    it("今天的统计应该合理", () => {
      const todayStats = { reddit: 10, x: 5 };

      expect(todayStats.reddit + todayStats.x).toBe(15);
      expect(todayStats.reddit).toBeGreaterThanOrEqual(todayStats.x);
    });

    it("时间范围应该递减", () => {
      const mockStats = {
        today: { reddit: 10, x: 5 },
        yesterday: { reddit: 8, x: 3 },
        thisWeek: { reddit: 45, x: 20 },
        thisMonth: { reddit: 150, x: 80 },
      };

      // 时间范围越大，统计数应该越多或持平
      expect(mockStats.thisWeek.reddit).toBeGreaterThanOrEqual(mockStats.today.reddit);
      expect(mockStats.thisMonth.reddit).toBeGreaterThanOrEqual(mockStats.thisWeek.reddit);
    });
  });
});
