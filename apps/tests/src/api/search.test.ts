import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

describe("Search API", () => {
  // A keyword known to exist in product names (fetched from real data)
  let existingKeyword: string;

  beforeAll(async () => {
    // Grab a product name from the database to use as a real search keyword
    const response = await fetch(`${API_BASE}/products?limit=1`);
    const result = await response.json();
    if (result.data.items.length > 0) {
      // Use first word of first product's name as keyword
      existingKeyword = result.data.items[0].name.split(" ")[0];
    }
  });

  // ============================================
  // GET /api/v1/search
  // ============================================

  describe("GET /api/v1/search", () => {
    it("should_return_200_with_search_result_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(typeof result.data.query).toBe("string");
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(typeof result.data.total).toBe("number");
      expect(typeof result.data.page).toBe("number");
      expect(typeof result.data.limit).toBe("number");
      expect(typeof result.data.totalPages).toBe("number");
    });

    it("should_echo_query_term_in_response", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=laptop`);
      const result = await response.json();

      // Assert
      expect(result.data.query).toBe("laptop");
    });

    it("should_return_400_for_empty_q_param", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=`);

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_400_when_q_param_is_missing", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search`);

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_400_for_whitespace_only_query", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=%20%20%20`);

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_empty_results_for_non_matching_query", async () => {
      // Arrange & Act — extremely unlikely to match any product
      const response = await fetch(`${API_BASE}/search?q=xzxzxznonexistent12345`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    });

    it("should_return_same_results_regardless_of_query_case", async () => {
      if (!existingKeyword) return;

      // Arrange & Act
      const lower = await fetch(`${API_BASE}/search?q=${existingKeyword.toLowerCase()}`).then((r) =>
        r.json()
      );
      const upper = await fetch(`${API_BASE}/search?q=${existingKeyword.toUpperCase()}`).then((r) =>
        r.json()
      );

      // Assert
      expect(lower.data.total).toBe(upper.data.total);
    });

    it("should_respect_page_and_limit_params", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
    });

    it("should_handle_page_0_by_normalizing_to_page_1", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBeGreaterThanOrEqual(1);
    });

    it("should_cap_limit_at_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_calculate_totalPages_correctly", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&limit=10`);
      const result = await response.json();

      // Assert
      if (result.data.total > 0) {
        const expected = Math.ceil(result.data.total / result.data.limit);
        expect(result.data.totalPages).toBe(expected);
      }
    });

    it("should_find_products_by_real_keyword", async () => {
      if (!existingKeyword) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(existingKeyword)}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.total).toBeGreaterThan(0);
    });

    it("should_respond_within_1000ms", async () => {
      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/search?q=test`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000);
    });
  });

  // ============================================
  // GET /api/v1/search/suggestions
  // ============================================

  describe("GET /api/v1/search/suggestions", () => {
    it("should_return_200_with_array_of_suggestions", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=a`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should_return_empty_array_for_non_matching_keyword", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=xzxzxznonexistent12345`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toEqual([]);
    });

    it("should_return_at_most_suggested_result_set", async () => {
      if (!existingKeyword) return;

      // Arrange & Act
      const response = await fetch(
        `${API_BASE}/search/suggestions?keyword=${encodeURIComponent(existingKeyword)}`
      );
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should_handle_empty_keyword_gracefully", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
