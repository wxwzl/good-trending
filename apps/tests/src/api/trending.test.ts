import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

describe("Trending API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/trending", () => {
    it("should return trending products", async () => {
      const response = await fetch("/api/v1/trending");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.period).toBeDefined();
    });

    it("should return paginated results", async () => {
      const response = await fetch("/api/v1/trending?page=1&limit=10");
      const data = await response.json();

      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
      expect(data.total).toBeDefined();
      expect(data.totalPages).toBeDefined();
    });

    it("should default to daily period", async () => {
      const response = await fetch("/api/v1/trending");
      const data = await response.json();

      expect(data.period).toBe("daily");
    });

    it("should support daily period filter", async () => {
      const response = await fetch("/api/v1/trending?period=daily");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("daily");
    });

    it("should support weekly period filter", async () => {
      const response = await fetch("/api/v1/trending?period=weekly");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("weekly");
    });

    it("should support monthly period filter", async () => {
      const response = await fetch("/api/v1/trending?period=monthly");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("monthly");
    });
  });

  describe("Trending data structure", () => {
    it("should include rank information", async () => {
      const response = await fetch("/api/v1/trending?limit=10");
      const data = await response.json();

      data.data.forEach((trend: { rank: number }, index: number) => {
        expect(trend.rank).toBeDefined();
        expect(typeof trend.rank).toBe("number");
        expect(trend.rank).toBeGreaterThan(0);
      });
    });

    it("should include mention count", async () => {
      const response = await fetch("/api/v1/trending?limit=5");
      const data = await response.json();

      data.data.forEach((trend: { mentions: number }) => {
        expect(trend.mentions).toBeDefined();
        expect(typeof trend.mentions).toBe("number");
        expect(trend.mentions).toBeGreaterThanOrEqual(0);
      });
    });

    it("should include sentiment score", async () => {
      const response = await fetch("/api/v1/trending?limit=5");
      const data = await response.json();

      data.data.forEach((trend: { sentiment: number }) => {
        expect(trend.sentiment).toBeDefined();
        expect(typeof trend.sentiment).toBe("number");
        expect(trend.sentiment).toBeGreaterThanOrEqual(-1);
        expect(trend.sentiment).toBeLessThanOrEqual(1);
      });
    });

    it("should include trending score", async () => {
      const response = await fetch("/api/v1/trending?limit=5");
      const data = await response.json();

      data.data.forEach((trend: { score: number }) => {
        expect(trend.score).toBeDefined();
        expect(typeof trend.score).toBe("number");
        expect(trend.score).toBeGreaterThanOrEqual(0);
      });
    });

    it("should include product reference", async () => {
      const response = await fetch("/api/v1/trending?limit=5");
      const data = await response.json();

      data.data.forEach((trend: { productId: string }) => {
        expect(trend.productId).toBeDefined();
        expect(typeof trend.productId).toBe("string");
      });
    });
  });

  describe("Pagination", () => {
    it("should handle page navigation", async () => {
      const page1Response = await fetch("/api/v1/trending?page=1&limit=5");
      const page1Data = await page1Response.json();

      const page2Response = await fetch("/api/v1/trending?page=2&limit=5");
      const page2Data = await page2Response.json();

      expect(page1Data.page).toBe(1);
      expect(page2Data.page).toBe(2);
    });

    it("should calculate total pages correctly", async () => {
      const response = await fetch("/api/v1/trending?limit=10");
      const data = await response.json();

      expect(data.totalPages).toBe(Math.ceil(data.total / data.limit));
    });
  });
});
