import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

const API_BASE = "http://localhost:3005/api/v1";

describe("Search API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/search", () => {
    it("should search products by query", async () => {
      const response = await fetch(`${API_BASE}/search?q=laptop`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.query).toBe("laptop");
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should return 400 for empty query", async () => {
      const response = await fetch(`${API_BASE}/search?q=`);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing query parameter", async () => {
      const response = await fetch(`${API_BASE}/search`);

      expect(response.status).toBe(400);
    });

    it("should return paginated search results", async () => {
      const response = await fetch(`${API_BASE}/search?q=test&page=1&limit=5`);
      const result = await response.json();

      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });
  });

  describe("Search functionality", () => {
    it("should search in product names", async () => {
      const response = await fetch(`${API_BASE}/search?q=test`);
      const result = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return empty results for no matches", async () => {
      const response = await fetch(`${API_BASE}/search?q=zzzznonexistentproduct12345`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.data).toEqual([]);
      expect(result.data.total).toBe(0);
    });
  });

  describe("Search results structure", () => {
    it("should include query in response", async () => {
      const response = await fetch(`${API_BASE}/search?q=test`);
      const result = await response.json();

      expect(result.data.query).toBe("test");
    });

    it("should include pagination metadata", async () => {
      const response = await fetch(`${API_BASE}/search?q=test&page=2&limit=10`);
      const result = await response.json();

      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    });
  });

  describe("Performance", () => {
    it("should respond within reasonable time", async () => {
      const start = Date.now();
      await fetch(`${API_BASE}/search?q=test`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });
});
