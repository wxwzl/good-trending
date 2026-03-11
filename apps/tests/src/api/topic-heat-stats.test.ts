import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockTopics } from "../mocks/handlers";

const API_BASE = "http://localhost:3015/api/v1";

describe("Topic Heat Stats API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/topics/:slug/heat-stats", () => {
    it("should_return_heat_stats_with_correct_structure", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toBeDefined();

      // Verify response structure
      expect(result.data.today).toBeDefined();
      expect(result.data.yesterday).toBeDefined();
      expect(result.data.last7Days).toBeDefined();
      expect(result.data).toHaveProperty("crawledProducts");
      expect(result.data.trend).toBeDefined();
      expect(Array.isArray(result.data.trend)).toBe(true);
    });

    it("should_return_valid_platform_stats", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { today, yesterday, last7Days } = result.data;

      // Each period should have reddit and x counts
      [today, yesterday, last7Days].forEach((period) => {
        expect(period).toHaveProperty("reddit");
        expect(period).toHaveProperty("x");
        expect(typeof period.reddit).toBe("number");
        expect(typeof period.x).toBe("number");
        expect(period.reddit).toBeGreaterThanOrEqual(0);
        expect(period.x).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_return_crawled_products_count", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      expect(result.data).toHaveProperty("crawledProducts");
      expect(typeof result.data.crawledProducts).toBe("number");
      expect(result.data.crawledProducts).toBeGreaterThanOrEqual(0);
    });

    it("should_return_valid_trend_data", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { trend } = result.data;
      expect(Array.isArray(trend)).toBe(true);

      if (trend.length > 0) {
        const item = trend[0];
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("reddit");
        expect(item).toHaveProperty("x");
        expect(typeof item.date).toBe("string");
        expect(typeof item.reddit).toBe("number");
        expect(typeof item.x).toBe("number");
        expect(item.reddit).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeGreaterThanOrEqual(0);
      }
    });

    it("should_return_trend_with_7_days_data", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { trend } = result.data;
      // Should have up to 7 days of trend data
      expect(trend.length).toBeLessThanOrEqual(7);
    });

    it("should_return_404_for_non_existent_topic", async () => {
      // Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic/heat-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_200ms", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const startTime = Date.now();
      await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe("Edge Cases", () => {
    it("should_handle_empty_trend_gracefully", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert - should return empty array rather than error
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.trend)).toBe(true);
    });

    it("should_handle_special_characters_in_slug", async () => {
      // Act
      const response = await fetch(`${API_BASE}/topics/special!@#$%/heat-stats`);

      // Assert - should handle special characters gracefully
      expect([404, 400]).toContain(response.status);
    });

    it("should_handle_url_encoded_slug", async () => {
      // Act - test with URL encoded special characters
      const encodedSlug = encodeURIComponent("test-topic-with spaces");

      const response = await fetch(`${API_BASE}/topics/${encodedSlug}/heat-stats`);

      // Assert - should not crash, either 200 or 404 is acceptable
      expect([200, 404]).toContain(response.status);
    });

    it("should_handle_very_long_slug", async () => {
      // Act - test with very long slug
      const longSlug = "a".repeat(200);

      const response = await fetch(`${API_BASE}/topics/${longSlug}/heat-stats`);

      // Assert - should handle gracefully
      expect([404, 400]).toContain(response.status);
    });
  });

  describe("Data Consistency", () => {
    it("should_have_consistent_data_between_periods", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { today, yesterday, last7Days } = result.data;

      // Today's data should be less than or equal to 7-day data
      expect(today.reddit).toBeLessThanOrEqual(last7Days.reddit);
      expect(today.x).toBeLessThanOrEqual(last7Days.x);

      // Yesterday's data should be less than or equal to 7-day data
      expect(yesterday.reddit).toBeLessThanOrEqual(last7Days.reddit);
      expect(yesterday.x).toBeLessThanOrEqual(last7Days.x);
    });

    it("should_have_valid_date_format_in_trend", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { trend } = result.data;

      trend.forEach((item: { date: string }) => {
        // Date should be in YYYY-MM-DD format
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Should be a valid date
        const date = new Date(item.date);
        expect(date.toString()).not.toBe("Invalid Date");
      });
    });
  });
});
