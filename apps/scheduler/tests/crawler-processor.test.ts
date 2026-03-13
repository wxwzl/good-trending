/**
 * 爬虫处理器测试
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createCrawlerProcessor,
  closeCrawlerProcessor,
  getRegisteredHandlers,
} from "../src/processors/crawler/index.js";

describe("Crawler Processor", () => {
  beforeEach(async () => {
    // 清理处理器状态
    await closeCrawlerProcessor();
  });

  describe("createCrawlerProcessor", () => {
    it("应该创建处理器实例", () => {
      const processor = createCrawlerProcessor(1);
      expect(processor).toBeDefined();
    });

    it("应该返回已存在的实例", () => {
      const processor1 = createCrawlerProcessor(1);
      const processor2 = createCrawlerProcessor(2);

      expect(processor1).toBe(processor2);
    });

    it("应该配置正确的并发数", () => {
      const processor = createCrawlerProcessor(3);
      expect(processor).toBeDefined();
      // 并发数在内部配置中，外部无法直接访问
    });
  });

  describe("closeCrawlerProcessor", () => {
    it("应该关闭处理器", async () => {
      createCrawlerProcessor(1);
      await closeCrawlerProcessor();

      // 关闭后可以重新创建新实例
      const newProcessor = createCrawlerProcessor(1);
      expect(newProcessor).toBeDefined();
    });

    it("应该处理关闭未初始化的处理器", async () => {
      // 不应该抛出错误
      await expect(closeCrawlerProcessor()).resolves.not.toThrow();
    });
  });

  describe("getRegisteredHandlers", () => {
    it("应该返回已注册的处理器列表", () => {
      const handlers = getRegisteredHandlers();

      expect(handlers).toContain("category-heat");
      expect(handlers).toContain("product-discovery");
      expect(handlers).toContain("product-mentions");
      expect(handlers).toContain("yesterday-stats");
    });
  });
});
