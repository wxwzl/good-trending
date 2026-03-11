import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockProducts } from "../mocks/handlers";

const API_BASE = "http://localhost:3015/api/v1";

describe("Product Stats API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/products/:id/social-stats", () => {
    it("should_return_social_stats_with_correct_structure", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/social-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();

      // Verify response structure
      expect(result.data.today).toBeDefined();
      expect(result.data.yesterday).toBeDefined();
      expect(result.data.thisWeek).toBeDefined();
      expect(result.data.thisMonth).toBeDefined();
      expect(result.data.history).toBeDefined();
      expect(Array.isArray(result.data.history)).toBe(true);
    });

    it("should_return_valid_platform_stats_structure", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/social-stats`);
      const result = await response.json();

      // Assert
      const { today, yesterday, thisWeek, thisMonth } = result.data;

      // Each period should have reddit and x counts
      [today, yesterday, thisWeek, thisMonth].forEach((period) => {
        expect(period).toHaveProperty("reddit");
        expect(period).toHaveProperty("x");
        expect(typeof period.reddit).toBe("number");
        expect(typeof period.x).toBe("number");
        expect(period.reddit).toBeGreaterThanOrEqual(0);
        expect(period.x).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_return_history_array_with_valid_items", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/social-stats`);
      const result = await response.json();

      // Assert
      const { history } = result.data;
      expect(Array.isArray(history)).toBe(true);

      if (history.length > 0) {
        const item = history[0];
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("reddit");
        expect(item).toHaveProperty("x");
        expect(typeof item.date).toBe("string");
        expect(typeof item.reddit).toBe("number");
        expect(typeof item.x).toBe("number");
      }
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id/social-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_200ms", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const startTime = Date.now();
      await fetch(`${API_BASE}/products/${productId}/social-stats`);
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe("GET /api/v1/products/:id/appearance-stats", () => {
    it("should_return_appearance_stats_with_correct_structure", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();

      // Verify bitmap fields
      expect(result.data).toHaveProperty("last7DaysBitmap");
      expect(result.data).toHaveProperty("last30DaysBitmap");
      expect(result.data).toHaveProperty("last60DaysBitmap");
      expect(typeof result.data.last7DaysBitmap).toBe("string");
      expect(typeof result.data.last30DaysBitmap).toBe("string");
      expect(typeof result.data.last60DaysBitmap).toBe("string");
    });

    it("should_return_valid_bitmap_format", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/appearance-stats`);
      const result = await response.json();

      // Assert
      const { last7DaysBitmap, last30DaysBitmap, last60DaysBitmap } = result.data;

      // Bitmaps should be binary strings (0s and 1s only)
      expect(last7DaysBitmap).toMatch(/^[01]{7}$/);
      expect(last30DaysBitmap).toMatch(/^[01]{30}$/);
      expect(last60DaysBitmap).toMatch(/^[01]{60}$/);
    });

    it("should_return_active_days_count", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(result.data).toHaveProperty("activeDays7");
      expect(result.data).toHaveProperty("activeDays30");
      expect(typeof result.data.activeDays7).toBe("number");
      expect(typeof result.data.activeDays30).toBe("number");
      expect(result.data.activeDays7).toBeGreaterThanOrEqual(0);
      expect(result.data.activeDays7).toBeLessThanOrEqual(7);
      expect(result.data.activeDays30).toBeGreaterThanOrEqual(0);
      expect(result.data.activeDays30).toBeLessThanOrEqual(30);
    });

    it("should_return_activity_score", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(result.data).toHaveProperty("activityScore");
      expect(typeof result.data.activityScore).toBe("number");
      expect(result.data.activityScore).toBeGreaterThanOrEqual(0);
      expect(result.data.activityScore).toBeLessThanOrEqual(5);
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id/appearance-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_200ms", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const startTime = Date.now();
      await fetch(`${API_BASE}/products/${productId}/appearance-stats`);
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe("GET /api/v1/products/:id/trend-history", () => {
    it("should_return_trend_history_with_correct_structure", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/trend-history`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty("history");
      expect(Array.isArray(result.data.history)).toBe(true);
    });

    it("should_return_valid_history_items", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/trend-history`);
      const result = await response.json();

      // Assert
      const { history } = result.data;

      if (history.length > 0) {
        const item = history[0];
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("periodType");
        expect(item).toHaveProperty("rank");
        expect(item).toHaveProperty("score");
        expect(item).toHaveProperty("redditMentions");
        expect(item).toHaveProperty("xMentions");

        expect(typeof item.date).toBe("string");
        expect(typeof item.periodType).toBe("string");
        expect(typeof item.rank).toBe("number");
        expect(typeof item.score).toBe("number");
        expect(typeof item.redditMentions).toBe("number");
        expect(typeof item.xMentions).toBe("number");

        expect(item.rank).toBeGreaterThan(0);
        expect(item.score).toBeGreaterThanOrEqual(0);
      }
    });

    it("should_return_valid_period_types", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/trend-history`);
      const result = await response.json();

      // Assert
      const { history } = result.data;
      const validPeriodTypes = [
        "TODAY",
        "YESTERDAY",
        "THIS_WEEK",
        "THIS_MONTH",
        "LAST_7_DAYS",
        "LAST_15_DAYS",
        "LAST_30_DAYS",
      ];

      history.forEach((item: { periodType: string }) => {
        expect(validPeriodTypes).toContain(item.periodType);
      });
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id/trend-history`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_200ms", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const startTime = Date.now();
      await fetch(`${API_BASE}/products/${productId}/trend-history`);
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe("Edge Cases", () => {
    it("should_handle_empty_social_stats_gracefully", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/social-stats`);
      const result = await response.json();

      // Assert - should return empty arrays/objects rather than error
      expect(response.status).toBe(200);
      expect(result.data.today).toBeDefined();
      expect(result.data.history).toBeDefined();
    });

    it("should_handle_empty_trend_history_gracefully", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}/trend-history`);
      const result = await response.json();

      // Assert - should return empty array rather than error
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.history)).toBe(true);
    });

    it("should_handle_invalid_product_id_format", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/invalid-id-format/social-stats`);

      // Assert - should return 404
      expect(response.status).toBe(404);
    });

    it("should_handle_special_characters_in_product_id", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/special!@#$%/social-stats`);

      // Assert - should handle special characters gracefully
      expect([404, 400]).toContain(response.status);
    });
  });
});
