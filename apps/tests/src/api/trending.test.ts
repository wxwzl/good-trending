import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

const API_BASE = "http://localhost:3005/api/v1";

describe("Trending API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/trending", () => {
    it("should_return_trending_products", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Response format: { data: { data: [...], period, total, page, limit, totalPages } }
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.period).toBeDefined();
    });

    it("should_return_paginated_results", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=1&limit=10`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });

    it("should_default_to_daily_period", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      // Assert
      expect(result.data.period).toBe("daily");
    });

    it("should_support_daily_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=daily`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.period).toBe("daily");
    });

    it("should_support_weekly_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=weekly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.period).toBe("weekly");
    });

    it("should_support_monthly_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=monthly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.period).toBe("monthly");
    });

    // Boundary cases
    it("should_handle_page_zero_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_handle_negative_page_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=-5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_limit_maximum_page_size_to_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });
  });

  describe("GET /api/v1/trending/daily", () => {
    it("should_return_daily_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/daily`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should_support_pagination", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/daily?page=2&limit=5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
    });
  });

  describe("GET /api/v1/trending/weekly", () => {
    it("should_return_weekly_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/weekly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });
  });

  describe("GET /api/v1/trending/monthly", () => {
    it("should_return_monthly_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/monthly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });
  });

  describe("GET /api/v1/trending/topic/:slug", () => {
    it("should_return_trending_for_valid_topic", async () => {
      // Arrange - First get topics to find a valid slug
      const topicsResponse = await fetch(`${API_BASE}/topics`);
      const topicsResult = await topicsResponse.json();

      if (topicsResult.data.data.length > 0) {
        const topicSlug = topicsResult.data.data[0].slug;

        // Act
        const response = await fetch(`${API_BASE}/trending/topic/${topicSlug}`);
        const result = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(result.data.topic).toBeDefined();
        expect(result.data.topic.slug).toBe(topicSlug);
      }
    });

    it("should_return_404_for_non_existent_topic", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/topic/non-existent-topic`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("Trending data structure", () => {
    it("should_include_rank_information", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=10`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((trend: { rank: number }, index: number) => {
        expect(trend.rank).toBeDefined();
        expect(typeof trend.rank).toBe("number");
        expect(trend.rank).toBeGreaterThan(0);
      });
    });

    it("should_include_mention_count", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((trend: { mentions: number }) => {
        expect(trend.mentions).toBeDefined();
        expect(typeof trend.mentions).toBe("number");
        expect(trend.mentions).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_include_trending_score", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((trend: { score: number }) => {
        expect(trend.score).toBeDefined();
        expect(typeof trend.score).toBe("number");
        expect(trend.score).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_include_product_reference", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((trend: { productId: string }) => {
        expect(trend.productId).toBeDefined();
        expect(typeof trend.productId).toBe("string");
      });
    });
  });

  describe("Pagination", () => {
    it("should_handle_page_navigation", async () => {
      // Arrange & Act
      const page1Response = await fetch(`${API_BASE}/trending?page=1&limit=5`);
      const page1Result = await page1Response.json();

      const page2Response = await fetch(`${API_BASE}/trending?page=2&limit=5`);
      const page2Result = await page2Response.json();

      // Assert
      expect(page1Result.data.page).toBe(1);
      expect(page2Result.data.page).toBe(2);
    });

    it("should_calculate_total_pages_correctly", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=10`);
      const result = await response.json();

      // Assert
      expect(result.data.totalPages).toBe(Math.ceil(result.data.total / result.data.limit));
    });

    it("should_handle_large_page_number_gracefully", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toEqual([]);
    });
  });
});