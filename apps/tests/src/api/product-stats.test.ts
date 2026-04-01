import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

describe("Product Stats API", () => {
  let firstProductId: string;

  beforeAll(async () => {
    const response = await fetch(`${API_BASE}/products?limit=1`);
    const result = await response.json();
    if (result.data.items.length > 0) {
      firstProductId = result.data.items[0].id;
    }
  });

  // ============================================
  // GET /api/v1/products/:id/social-stats
  // ============================================

  describe("GET /api/v1/products/:id/social-stats", () => {
    it("should_return_200_with_correct_structure", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/social-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.today).toBeDefined();
      expect(result.data.yesterday).toBeDefined();
      expect(result.data.thisWeek).toBeDefined();
      expect(result.data.thisMonth).toBeDefined();
      expect(Array.isArray(result.data.history)).toBe(true);
    });

    it("should_have_reddit_and_x_counts_in_each_period", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/social-stats`);
      const result = await response.json();

      // Assert
      const { today, yesterday, thisWeek, thisMonth } = result.data;
      [today, yesterday, thisWeek, thisMonth].forEach((period) => {
        expect(typeof period.reddit).toBe("number");
        expect(typeof period.x).toBe("number");
        expect(period.reddit).toBeGreaterThanOrEqual(0);
        expect(period.x).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_history_items_with_valid_date_format", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/social-stats`);
      const result = await response.json();

      // Assert
      const { history } = result.data;
      if (history.length > 0) {
        history.forEach((item: { date: string; reddit: number; x: number }) => {
          // Date must be YYYY-MM-DD
          expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(new Date(item.date).toString()).not.toBe("Invalid Date");
          expect(typeof item.reddit).toBe("number");
          expect(typeof item.x).toBe("number");
          expect(item.reddit).toBeGreaterThanOrEqual(0);
          expect(item.x).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it("should_have_cumulative_counts_where_larger_period_gte_smaller", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/social-stats`);
      const result = await response.json();

      // Assert — week totals should be >= today totals
      const { today, thisWeek, thisMonth } = result.data;
      expect(thisWeek.reddit).toBeGreaterThanOrEqual(today.reddit);
      expect(thisWeek.x).toBeGreaterThanOrEqual(today.x);
      expect(thisMonth.reddit).toBeGreaterThanOrEqual(today.reddit);
      expect(thisMonth.x).toBeGreaterThanOrEqual(today.x);
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000/social-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_500ms", async () => {
      if (!firstProductId) return;

      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/products/${firstProductId}/social-stats`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // GET /api/v1/products/:id/appearance-stats
  // ============================================

  describe("GET /api/v1/products/:id/appearance-stats", () => {
    it("should_return_200_with_bitmap_fields", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(typeof result.data.last7DaysBitmap).toBe("string");
      expect(typeof result.data.last30DaysBitmap).toBe("string");
      expect(typeof result.data.last60DaysBitmap).toBe("string");
    });

    it("should_have_bitmaps_with_correct_lengths", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(result.data.last7DaysBitmap).toMatch(/^[01]{7}$/);
      expect(result.data.last30DaysBitmap).toMatch(/^[01]{30}$/);
      expect(result.data.last60DaysBitmap).toMatch(/^[01]{60}$/);
    });

    it("should_have_activeDays7_consistent_with_bitmap", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const result = await response.json();

      // Assert — activeDays7 must equal count of '1' bits in last7DaysBitmap
      const bitmapOnesCount = (result.data.last7DaysBitmap as string)
        .split("")
        .filter((b) => b === "1").length;
      expect(result.data.activeDays7).toBe(bitmapOnesCount);
    });

    it("should_have_activeDays7_within_valid_range", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(result.data.activeDays7).toBeGreaterThanOrEqual(0);
      expect(result.data.activeDays7).toBeLessThanOrEqual(7);
      expect(result.data.activeDays30).toBeGreaterThanOrEqual(0);
      expect(result.data.activeDays30).toBeLessThanOrEqual(30);
    });

    it("should_have_activityScore_within_0_to_5_range", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const result = await response.json();

      // Assert
      expect(typeof result.data.activityScore).toBe("number");
      expect(result.data.activityScore).toBeGreaterThanOrEqual(0);
      expect(result.data.activityScore).toBeLessThanOrEqual(5);
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000/appearance-stats`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_500ms", async () => {
      if (!firstProductId) return;

      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/products/${firstProductId}/appearance-stats`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // GET /api/v1/products/:id/trend-history
  // ============================================

  describe("GET /api/v1/products/:id/trend-history", () => {
    it("should_return_200_with_history_array", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/trend-history`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toHaveProperty("history");
      expect(Array.isArray(result.data.history)).toBe(true);
    });

    it("should_have_valid_fields_on_history_items", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/trend-history`);
      const result = await response.json();

      // Assert
      const { history } = result.data;
      if (history.length > 0) {
        const item = history[0];
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof item.periodType).toBe("string");
        expect(typeof item.rank).toBe("number");
        expect(item.rank).toBeGreaterThan(0);
        expect(typeof item.score).toBe("number");
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(typeof item.redditMentions).toBe("number");
        expect(typeof item.xMentions).toBe("number");
      }
    });

    it("should_have_valid_periodType_on_all_history_items", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}/trend-history`);
      const result = await response.json();

      // Assert
      const validPeriodTypes = [
        "TODAY",
        "YESTERDAY",
        "THIS_WEEK",
        "THIS_MONTH",
        "LAST_7_DAYS",
        "LAST_15_DAYS",
        "LAST_30_DAYS",
      ];
      result.data.history.forEach((item: { periodType: string }) => {
        expect(validPeriodTypes).toContain(item.periodType);
      });
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000/trend-history`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_respond_within_500ms", async () => {
      if (!firstProductId) return;

      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/products/${firstProductId}/trend-history`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500);
    });
  });
});
