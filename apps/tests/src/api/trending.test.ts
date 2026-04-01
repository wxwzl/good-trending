import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

describe("Trending API", () => {
  // ============================================
  // GET /api/v1/trending
  // ============================================

  describe("GET /api/v1/trending", () => {
    it("should_return_200_with_paginated_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(typeof result.data.total).toBe("number");
      expect(typeof result.data.page).toBe("number");
      expect(typeof result.data.limit).toBe("number");
      expect(typeof result.data.totalPages).toBe("number");
    });

    it("should_respect_page_and_limit_params", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=1&limit=10`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
    });

    it("should_support_TODAY_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=TODAY`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it("should_support_THIS_WEEK_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=THIS_WEEK`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it("should_support_THIS_MONTH_period_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?period=THIS_MONTH`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it("should_handle_page_0_by_normalizing_to_page_1", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBeGreaterThanOrEqual(1);
    });

    it("should_handle_negative_page_by_normalizing_to_page_1", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=-5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBeGreaterThanOrEqual(1);
    });

    it("should_cap_limit_at_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_return_empty_items_for_out_of_range_page", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toEqual([]);
    });

    it("should_calculate_totalPages_correctly", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending?limit=10`);
      const result = await response.json();

      // Assert
      const expected = Math.ceil(result.data.total / result.data.limit);
      expect(result.data.totalPages).toBe(expected);
    });
  });

  // ============================================
  // Trending data structure validation
  // ============================================

  describe("Trending item data structure", () => {
    let items: Record<string, unknown>[];

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/trending?limit=5`);
      const result = await response.json();
      items = result.data.items;
    });

    it("should_have_valid_rank_field", async () => {
      items.forEach((trend) => {
        expect(typeof trend.rank).toBe("number");
        expect(trend.rank as number).toBeGreaterThan(0);
      });
    });

    it("should_have_valid_score_field", async () => {
      items.forEach((trend) => {
        expect(typeof trend.score).toBe("number");
        expect(trend.score as number).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_product_reference_fields", async () => {
      items.forEach((trend) => {
        expect(typeof trend.productId).toBe("string");
        expect(typeof trend.productName).toBe("string");
        expect(typeof trend.productSlug).toBe("string");
      });
    });

    it("should_have_social_mention_counts", async () => {
      items.forEach((trend) => {
        expect(typeof trend.redditMentions).toBe("number");
        expect(typeof trend.xMentions).toBe("number");
        expect(trend.redditMentions as number).toBeGreaterThanOrEqual(0);
        expect(trend.xMentions as number).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_valid_periodType_field", async () => {
      const validPeriods = [
        "TODAY",
        "YESTERDAY",
        "THIS_WEEK",
        "THIS_MONTH",
        "LAST_7_DAYS",
        "LAST_15_DAYS",
        "LAST_30_DAYS",
      ];
      items.forEach((trend) => {
        expect(typeof trend.periodType).toBe("string");
        expect(validPeriods).toContain(trend.periodType);
      });
    });

    it("should_have_items_ordered_by_rank_ascending", async () => {
      if (items.length < 2) return;
      for (let i = 1; i < items.length; i++) {
        expect(items[i].rank as number).toBeGreaterThanOrEqual(items[i - 1].rank as number);
      }
    });
  });

  // ============================================
  // GET /api/v1/trending/daily
  // ============================================

  describe("GET /api/v1/trending/daily", () => {
    it("should_return_daily_trending_list", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/daily`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });

    it("should_support_pagination_params", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/daily?page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
    });
  });

  // ============================================
  // GET /api/v1/trending/weekly
  // ============================================

  describe("GET /api/v1/trending/weekly", () => {
    it("should_return_weekly_trending_list", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/weekly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });
  });

  // ============================================
  // GET /api/v1/trending/monthly
  // ============================================

  describe("GET /api/v1/trending/monthly", () => {
    it("should_return_monthly_trending_list", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/monthly`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
    });
  });

  // ============================================
  // GET /api/v1/trending/topic/:slug
  // ============================================

  describe("GET /api/v1/trending/topic/:slug", () => {
    let firstTopicSlug: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/topics?limit=1`);
      const result = await response.json();
      if (result.data.items.length > 0) {
        firstTopicSlug = result.data.items[0].slug;
      }
    });

    it("should_return_trending_for_valid_topic_slug", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/topic/${firstTopicSlug}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(typeof result.data.total).toBe("number");
    });

    it("should_return_404_for_non_existent_topic_slug", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/trending/topic/non-existent-topic-000`);

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
