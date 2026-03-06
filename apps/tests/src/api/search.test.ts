import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

const API_BASE = "http://localhost:3005/api/v1";

describe("Search API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/search", () => {
    it("should_search_products_by_query", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=laptop`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.query).toBe("laptop");
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should_return_400_for_empty_query", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=`);

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_400_for_missing_query_parameter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search`);

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_paginated_search_results", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });

    // Boundary cases
    it("should_handle_page_zero_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_handle_negative_page_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=-1`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_limit_maximum_page_size_to_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_handle_whitespace_only_query", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=%20%20%20`);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe("Search functionality", () => {
    it("should_search_in_product_names", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test`);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should_return_empty_results_for_no_matches", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=zzzznonexistentproduct12345`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toEqual([]);
      expect(result.data.total).toBe(0);
    });

    it("should_be_case_insensitive", async () => {
      // Arrange & Act
      const response1 = await fetch(`${API_BASE}/search?q=LAPTOP`);
      const response2 = await fetch(`${API_BASE}/search?q=laptop`);
      const result1 = await response1.json();
      const result2 = await response2.json();

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      // Both should return same results
      expect(result1.data.total).toBe(result2.data.total);
    });
  });

  describe("Search results structure", () => {
    it("should_include_query_in_response", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test`);
      const result = await response.json();

      // Assert
      expect(result.data.query).toBe("test");
    });

    it("should_include_pagination_metadata", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test&page=2&limit=10`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    });

    it("should_include_total_and_totalPages", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search?q=test`);
      const result = await response.json();

      // Assert
      expect(result.data.total).toBeDefined();
      expect(typeof result.data.total).toBe("number");
      expect(result.data.totalPages).toBeDefined();
      expect(typeof result.data.totalPages).toBe("number");
    });
  });

  describe("GET /api/v1/search/suggestions", () => {
    it("should_return_search_suggestions", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=lap`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should_return_empty_array_for_no_matches", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=zzzznonexistent`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toEqual([]);
    });

    it("should_handle_empty_keyword", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/search/suggestions?keyword=`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should_respond_within_reasonable_time", async () => {
      // Arrange
      const start = Date.now();

      // Act
      await fetch(`${API_BASE}/search?q=test`);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000);
    });
  });
});