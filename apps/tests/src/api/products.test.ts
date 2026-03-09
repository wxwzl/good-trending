import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockProducts } from "../mocks/handlers";

const API_BASE = "http://localhost:3015/api/v1";

describe("Products API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/products", () => {
    it("should_return_paginated_list_of_products", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?page=1&limit=10`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Response format: { data: { items: [...], total, page, limit, totalPages } }
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.total).toBeDefined();
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.totalPages).toBeDefined();
    });

    it("should_return_correct_pagination_metadata", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?page=2&limit=5`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
    });

    it("should_filter_products_by_discovered_from", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?discoveredFrom=X_PLATFORM`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      result.data.items.forEach((product: { discoveredFrom: string }) => {
        expect(product.discoveredFrom).toBe("X_PLATFORM");
      });
    });

    it("should_filter_products_by_AMAZON_discovered_from", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?discoveredFrom=AMAZON`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      result.data.items.forEach((product: { discoveredFrom: string }) => {
        expect(product.discoveredFrom).toBe("AMAZON");
      });
    });

    it("should_return_all_products_when_no_discovered_from_filter", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThan(0);
    });

    it("should_handle_pagination_correctly", async () => {
      // Arrange & Act
      const page1Response = await fetch(`${API_BASE}/products?page=1&limit=5`);
      const page1Result = await page1Response.json();

      const page2Response = await fetch(`${API_BASE}/products?page=2&limit=5`);
      const page2Result = await page2Response.json();

      // Assert
      expect(page1Result.data.items.length).toBeLessThanOrEqual(5);
      expect(page2Result.data.items.length).toBeLessThanOrEqual(5);

      // Ensure different products on different pages
      if (page1Result.data.items.length > 0 && page2Result.data.items.length > 0) {
        expect(page1Result.data.items[0].id).not.toBe(page2Result.data.items[0].id);
      }
    });

    // Boundary cases
    it("should_handle_page_zero_as_page_one", async () => {
      // Arrange & Act - page=0 should be treated as page=1
      const response = await fetch(`${API_BASE}/products?page=0&limit=10`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_handle_negative_page_as_page_one", async () => {
      // Arrange & Act - page=-1 should be treated as page=1
      const response = await fetch(`${API_BASE}/products?page=-1&limit=10`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_limit_maximum_page_size_to_100", async () => {
      // Arrange & Act - limit=200 should be capped at 100
      const response = await fetch(`${API_BASE}/products?limit=200`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_handle_limit_zero_as_default_limit", async () => {
      // Arrange & Act - limit=0 should be treated as default
      const response = await fetch(`${API_BASE}/products?limit=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeGreaterThanOrEqual(1);
    });

    it("should_handle_large_page_number_gracefully", async () => {
      // Arrange & Act - request a very large page number
      const response = await fetch(`${API_BASE}/products?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBeDefined();
    });
  });

  describe("GET /api/v1/products/:id", () => {
    it("should_return_a_single_product_by_ID", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Single product response: { data: { id, name, ... } }
      expect(result.data.id).toBe(productId);
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
    });

    it("should_return_404_for_non_existent_product", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/non-existent-id`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_return_product_with_all_required_fields", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}`);
      const result = await response.json();

      // Assert
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
      expect(result.data.description).toBeDefined();
      expect(result.data.discoveredFrom).toBeDefined();
      expect(result.data.amazonId).toBeDefined();
      expect(result.data.firstSeenAt).toBeDefined();
    });
  });

  describe("GET /api/v1/products/slug/:slug", () => {
    it("should_return_a_product_by_slug", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productSlug = mockProducts[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/products/slug/${productSlug}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(productSlug);
    });

    it("should_return_404_for_non_existent_slug", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/slug/non-existent-slug`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/v1/products", () => {
    it("should_create_product_with_valid_data", async () => {
      // Arrange
      const newProduct = {
        name: "New Test Product",
        slug: "new-test-product",
        sourceUrl: "https://example.com/new-product-unique",
        amazonId: "new-amazon-123",
        discoveredFrom: "AMAZON",
        description: "Test description",
        price: "99.99",
        currency: "USD",
      };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.name).toBe(newProduct.name);
      expect(result.data.sourceUrl).toBe(newProduct.sourceUrl);
    });

    it("should_return_400_for_missing_required_fields", async () => {
      // Arrange
      const invalidProduct = { name: "Missing required fields" };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidProduct),
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_409_for_duplicate_source_url", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const duplicateProduct = {
        name: "Duplicate Product",
        slug: "duplicate-product",
        sourceUrl: mockProducts[0].sourceUrl,
        amazonId: "duplicate-amazon-id",
        discoveredFrom: "AMAZON",
      };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateProduct),
      });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe("PUT /api/v1/products/:id", () => {
    it("should_update_product_with_valid_data", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;
      const updateData = { name: "Updated Product Name" };

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.name).toBe(updateData.name);
    });

    it("should_return_404_for_non_existent_product_update", async () => {
      // Arrange
      const updateData = { name: "Updated Name" };

      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/products/:id", () => {
    it("should_delete_product_successfully", async () => {
      // Arrange
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      // Act
      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
      });

      // Assert
      expect(response.status).toBe(204);
    });

    it("should_return_404_for_non_existent_product_delete", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/non-existent-id`, {
        method: "DELETE",
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("Product data structure", () => {
    it("should_have_valid_product_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=1`);
      const result = await response.json();

      // Assert
      if (result.data.items.length > 0) {
        const product = result.data.items[0];

        expect(product.id).toBeDefined();
        expect(typeof product.id).toBe("string");
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe("string");
        expect(product.slug).toBeDefined();
        expect(typeof product.slug).toBe("string");
        expect(["X_PLATFORM", "AMAZON", "REDDIT"]).toContain(product.discoveredFrom);
        expect(product.amazonId).toBeDefined();
        expect(product.firstSeenAt).toBeDefined();
      }
    });

    it("should_have_valid_price_data", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((product: { price: string | null; currency: string }) => {
        if (product.price !== null) {
          expect(typeof product.price).toBe("string");
          expect(parseFloat(product.price)).toBeGreaterThanOrEqual(0);
        }
        expect(product.currency).toBeDefined();
      });
    });
  });
});
