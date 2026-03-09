import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

const API_BASE = "http://localhost:3015/api/v1";

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
      // Response format: { data: { items: [...], total, page, limit, totalPages } }
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.total).toBeDefined();
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

    it("should_default_to_today_period", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
    });

    it("should_support_today_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=TODAY`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
    });

    it("should_support_this_week_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=THIS_WEEK`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
    });

    it("should_support_this_month_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=THIS_MONTH`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
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

  describe("GET /api/v1/trending/today", () => {
    it("should_return_today_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/today`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it("should_support_pagination", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/today?page=2&limit=5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
    });
  });

  describe("GET /api/v1/trending/this-week", () => {
    it("should_return_this_week_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/this-week`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
    });
  });

  describe("GET /api/v1/trending/this-month", () => {
    it("should_return_this_month_trending", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/this-month`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
    });
  });

  describe("GET /api/v1/trending/topic/:slug", () => {
    it("should_return_trending_for_valid_topic", async () => {
      // Arrange - First get topics to find a valid slug
      const topicsResponse = await fetch(`${API_BASE}/topics`);
      const topicsResult = await topicsResponse.json();

      if (topicsResult.data.items.length > 0) {
        const topicSlug = topicsResult.data.items[0].slug;

        // Act
        const response = await fetch(`${API_BASE}/trending/topic/${topicSlug}`);
        const result = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(result.data.items).toBeDefined();
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
      result.data.items.forEach((trend: { rank: number }) => {
        expect(trend.rank).toBeDefined();
        expect(typeof trend.rank).toBe("number");
        expect(trend.rank).toBeGreaterThan(0);
      });
    });

    it("should_include_trending_score", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((trend: { score: number }) => {
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
      result.data.items.forEach((trend: { productId: string }) => {
        expect(trend.productId).toBeDefined();
        expect(typeof trend.productId).toBe("string");
      });
    });

    it("should_include_product_details", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((trend: { productName: string; productSlug: string }) => {
        expect(trend.productName).toBeDefined();
        expect(typeof trend.productName).toBe("string");
        expect(trend.productSlug).toBeDefined();
        expect(typeof trend.productSlug).toBe("string");
      });
    });

    it("should_include_mention_counts", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((trend: { redditMentions: number; xMentions: number }) => {
        expect(trend.redditMentions).toBeDefined();
        expect(typeof trend.redditMentions).toBe("number");
        expect(trend.xMentions).toBeDefined();
        expect(typeof trend.xMentions).toBe("number");
      });
    });

    it("should_include_period_type", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((trend: { periodType: string }) => {
        expect(trend.periodType).toBeDefined();
        expect(typeof trend.periodType).toBe("string");
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
      expect(result.data.items).toEqual([]);
    });
  });
});
