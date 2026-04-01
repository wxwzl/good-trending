import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

describe("Topic Heat Stats API", () => {
  let firstTopicSlug: string;

  beforeAll(async () => {
    const response = await fetch(`${API_BASE}/topics?limit=1`);
    const result = await response.json();
    if (result.data.items.length > 0) {
      firstTopicSlug = result.data.items[0].slug;
    }
  });

  // ============================================
  // GET /api/v1/topics/:slug/heat-stats
  // ============================================

  describe("GET /api/v1/topics/:slug/heat-stats", () => {
    it("should_return_200_with_correct_structure", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.today).toBeDefined();
      expect(result.data.yesterday).toBeDefined();
      expect(result.data.last7Days).toBeDefined();
      expect(typeof result.data.crawledProducts).toBe("number");
      expect(Array.isArray(result.data.trend)).toBe(true);
    });

    it("should_have_reddit_and_x_in_each_period", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      const { today, yesterday, last7Days } = result.data;
      [today, yesterday, last7Days].forEach((period) => {
        expect(typeof period.reddit).toBe("number");
        expect(typeof period.x).toBe("number");
        expect(period.reddit).toBeGreaterThanOrEqual(0);
        expect(period.x).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_crawledProducts_as_non_negative_number", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      expect(result.data.crawledProducts).toBeGreaterThanOrEqual(0);
    });

    it("should_have_trend_with_at_most_7_items", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      expect(result.data.trend.length).toBeLessThanOrEqual(7);
    });

    it("should_have_valid_date_format_in_trend_items", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert
      result.data.trend.forEach((item: { date: string; reddit: number; x: number }) => {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(item.date).toString()).not.toBe("Invalid Date");
        expect(typeof item.reddit).toBe("number");
        expect(typeof item.x).toBe("number");
        expect(item.reddit).toBeGreaterThanOrEqual(0);
        expect(item.x).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_trend_dates_in_chronological_order", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert — trend should be ordered oldest to newest
      const { trend } = result.data;
      if (trend.length >= 2) {
        for (let i = 1; i < trend.length; i++) {
          expect(trend[i].date >= trend[i - 1].date).toBe(true);
        }
      }
    });

    it("should_have_last7Days_gte_today_for_both_platforms", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const result = await response.json();

      // Assert — cumulative 7-day count must be >= single day count
      const { today, last7Days } = result.data;
      expect(last7Days.reddit).toBeGreaterThanOrEqual(today.reddit);
      expect(last7Days.x).toBeGreaterThanOrEqual(today.x);
    });

    it("should_return_404_for_non_existent_topic", async () => {
      // Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic-000/heat-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_return_4xx_for_special_characters_in_slug", async () => {
      // Act
      const response = await fetch(`${API_BASE}/topics/special!@%23%24%25/heat-stats`);

      // Assert
      expect([400, 404]).toContain(response.status);
    });

    it("should_handle_url_encoded_slug_gracefully", async () => {
      // Act
      const response = await fetch(
        `${API_BASE}/topics/${encodeURIComponent("test topic with spaces")}/heat-stats`
      );

      // Assert — encoded slug not found, but server should not crash
      expect([200, 404]).toContain(response.status);
    });

    it("should_respond_within_500ms", async () => {
      if (!firstTopicSlug) return;

      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/topics/${firstTopicSlug}/heat-stats`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500);
    });
  });
});
