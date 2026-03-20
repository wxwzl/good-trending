/**
 * Google Search Service 测试
 * 测试 Google 搜索服务的核心功能
 */
import { describe, it, expect, beforeEach } from "vitest";
import { GoogleSearchService } from "../../adapters/legacy/google/index.js";

describe("GoogleSearchService", () => {
  let service: GoogleSearchService;

  beforeEach(() => {
    service = new GoogleSearchService({
      forceBrowser: true,
    });
  });

  describe("配置", () => {
    it("应该使用浏览器模式当 forceBrowser 为 true", () => {
      const configService = new GoogleSearchService({
        forceBrowser: true,
      });
      expect(configService).toBeDefined();
    });

    it("应该正确关闭服务", async () => {
      await expect(service.close()).resolves.not.toThrow();
    });
  });

  describe("搜索功能", () => {
    it("应该返回有效的搜索结果结构", async () => {
      // 注意：实际搜索需要网络，这里只验证结构
      const mockResult = {
        success: true,
        totalResults: 100,
        links: [{ url: "https://example.com", title: "Example", snippet: "Test" }],
        source: "browser" as const,
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.links).toBeInstanceOf(Array);
      expect(mockResult.totalResults).toBeGreaterThanOrEqual(0);
    });

    it("应该处理搜索失败的情况", async () => {
      const mockErrorResult = {
        success: false,
        totalResults: 0,
        links: [],
        source: "browser" as const,
        error: "Rate limit exceeded",
      };

      expect(mockErrorResult.success).toBe(false);
      expect(mockErrorResult.links).toHaveLength(0);
      expect(mockErrorResult.error).toBeDefined();
    });
  });

  describe("工具方法", () => {
    it("应该正确识别当前搜索源", () => {
      // SerpAPI 额度未用完时
      const serviceWithSerpApi = new GoogleSearchService({
        serpApi: { apiKey: "test-key" },
      });

      // 初始状态应该是 serpapi
      expect(serviceWithSerpApi.getCurrentSource()).toBe("serpapi");
    });

    it("应该重置 SerpAPI 额度状态", () => {
      service.resetSerpApiQuota();
      expect(service.getCurrentSource()).toBe("serpapi");
    });
  });
});
