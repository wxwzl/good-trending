import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

const API_BASE = "http://localhost:3005/api/v1";

describe("Trending API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/trending", () => {
    it("should return trending products", async () => {
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...], period, total, page, limit, totalPages } }
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.period).toBeDefined();
    });

    it("should return paginated results", async () => {
      const response = await fetch(`${API_BASE}/trending?page=1&limit=10`);
      const result = await response.json();

      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });

    it("should default to daily period", async () => {
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      expect(result.data.period).toBe("daily");
    });

    it("should support daily period filter", async () => {
      const response = await fetch(`${API_BASE}/trending?period=daily`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.period).toBe("daily");
    });

    it("should support weekly period filter", async () => {
      const response = await fetch(`${API_BASE}/trending?period=weekly`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.period).toBe("weekly");
    });

    it("should support monthly period filter", async () => {
      const response = await fetch(`${API_BASE}/trending?period=monthly`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.period).toBe("monthly");
    });
  });

  describe("Trending data structure", () => {
    it("should include rank information", async () => {
      const response = await fetch(`${API_BASE}/trending?limit=10`);
      const result = await response.json();

      result.data.data.forEach((trend: { rank: number }, index: number) => {
        expect(trend.rank).toBeDefined();
        expect(typeof trend.rank).toBe("number");
        expect(trend.rank).toBeGreaterThan(0);
      });
    });

    it("should include mention count", async () => {
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      result.data.data.forEach((trend: { mentions: number }) => {
        expect(trend.mentions).toBeDefined();
        expect(typeof trend.mentions).toBe("number");
        expect(trend.mentions).toBeGreaterThanOrEqual(0);
      });
    });

    it("should include trending score", async () => {
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      result.data.data.forEach((trend: { score: number }) => {
        expect(trend.score).toBeDefined();
        expect(typeof trend.score).toBe("number");
        expect(trend.score).toBeGreaterThanOrEqual(0);
      });
    });

    it("should include product reference", async () => {
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      result.data.data.forEach((trend: { productId: string }) => {
        expect(trend.productId).toBeDefined();
        expect(typeof trend.productId).toBe("string");
      });
    });
  });

  describe("Pagination", () => {
    it("should handle page navigation", async () => {
      const page1Response = await fetch(`${API_BASE}/trending?page=1&limit=5`);
      const page1Result = await page1Response.json();

      const page2Response = await fetch(`${API_BASE}/trending?page=2&limit=5`);
      const page2Result = await page2Response.json();

      expect(page1Result.data.page).toBe(1);
      expect(page2Result.data.page).toBe(2);
    });

    it("should calculate total pages correctly", async () => {
      const response = await fetch(`${API_BASE}/trending?limit=10`);
      const result = await response.json();

      expect(result.data.totalPages).toBe(Math.ceil(result.data.total / result.data.limit));
    });
  });
});
