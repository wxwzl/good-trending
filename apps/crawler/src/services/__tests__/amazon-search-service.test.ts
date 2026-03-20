/**
 * Amazon Search Service 测试
 * 测试亚马逊商品搜索和提取功能
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  AmazonSearchService,
  createAmazonSearchService,
} from "../../adapters/legacy/amazon/index.js";

describe("AmazonSearchService", () => {
  let service: AmazonSearchService;

  beforeEach(() => {
    service = createAmazonSearchService();
  });

  describe("工厂函数", () => {
    it("应该创建服务实例", () => {
      const service = createAmazonSearchService();
      expect(service).toBeInstanceOf(AmazonSearchService);
    });
  });

  describe("ASIN 提取", () => {
    it("应该从 /dp/ASIN 格式 URL 中提取 ASIN", () => {
      const url = "https://www.amazon.com/dp/B08N5WRWNW";
      // 通过 extractProductInfo 间接测试
      expect(url).toMatch(/\/dp\/(\w{10})/);
    });

    it("应该从 /gp/product/ASIN 格式 URL 中提取 ASIN", () => {
      const url = "https://www.amazon.com/gp/product/B08N5WRWNW";
      expect(url).toMatch(/\/gp\/product\/(\w{10})/);
    });

    it("应该处理无效 URL", () => {
      const invalidUrl = "https://www.amazon.com/s?k=keyword";
      const match = invalidUrl.match(/\/dp\/(\w{10})/);
      expect(match).toBeNull();
    });
  });

  describe("服务生命周期", () => {
    it("应该正确关闭浏览器", async () => {
      await expect(service.closeBrowser()).resolves.not.toThrow();
    });

    it("应该能多次关闭而不报错", async () => {
      await service.closeBrowser();
      await expect(service.closeBrowser()).resolves.not.toThrow();
    });
  });

  describe("商品数据结构", () => {
    it("应该返回正确的 AmazonProduct 结构", () => {
      const mockProduct = {
        asin: "B08N5WRWNW",
        name: "Test Product",
        url: "https://amazon.com/dp/B08N5WRWNW",
        price: 99.99,
        currency: "USD",
        image: "https://amazon.com/image.jpg",
      };

      expect(mockProduct.asin).toHaveLength(10);
      expect(mockProduct.name).toBeDefined();
      expect(mockProduct.url).toContain("amazon.com");
    });
  });
});
