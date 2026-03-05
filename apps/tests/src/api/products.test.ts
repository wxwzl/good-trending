import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockProducts } from "../mocks/handlers";

const API_BASE = "http://localhost:3005/api/v1";

describe("Products API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/products", () => {
    it("should return paginated list of products", async () => {
      const response = await fetch(`${API_BASE}/products?page=1&limit=10`);
      const result = await response.json();

      expect(response.status).toBe(200);
      // Response format: { data: { data: [...], total, page, limit, totalPages } }
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.total).toBeDefined();
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.totalPages).toBeDefined();
    });

    it("should return correct pagination metadata", async () => {
      const response = await fetch(`${API_BASE}/products?page=2&limit=5`);
      const result = await response.json();

      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
    });

    it("should filter products by source type", async () => {
      const response = await fetch(`${API_BASE}/products?sourceType=TWITTER`);
      const result = await response.json();

      expect(response.status).toBe(200);
      result.data.data.forEach((product: { sourceType: string }) => {
        expect(product.sourceType).toBe("TWITTER");
      });
    });

    it("should filter products by AMAZON source type", async () => {
      const response = await fetch(`${API_BASE}/products?sourceType=AMAZON`);
      const result = await response.json();

      expect(response.status).toBe(200);
      result.data.data.forEach((product: { sourceType: string }) => {
        expect(product.sourceType).toBe("AMAZON");
      });
    });

    it("should return all products when no source type filter", async () => {
      const response = await fetch(`${API_BASE}/products`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.data.length).toBeGreaterThan(0);
    });

    it("should handle pagination correctly", async () => {
      const page1Response = await fetch(`${API_BASE}/products?page=1&limit=5`);
      const page1Result = await page1Response.json();

      const page2Response = await fetch(`${API_BASE}/products?page=2&limit=5`);
      const page2Result = await page2Response.json();

      expect(page1Result.data.data.length).toBeLessThanOrEqual(5);
      expect(page2Result.data.data.length).toBeLessThanOrEqual(5);

      // Ensure different products on different pages
      if (page1Result.data.data.length > 0 && page2Result.data.data.length > 0) {
        expect(page1Result.data.data[0].id).not.toBe(page2Result.data.data[0].id);
      }
    });
  });

  describe("GET /api/v1/products/:id", () => {
    it("should return a single product by ID", async () => {
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      const response = await fetch(`${API_BASE}/products/${productId}`);
      const result = await response.json();

      expect(response.status).toBe(200);
      // Single product response: { data: { id, name, ... } }
      expect(result.data.id).toBe(productId);
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
    });

    it("should return 404 for non-existent product", async () => {
      const response = await fetch(`${API_BASE}/products/non-existent-id`);

      expect(response.status).toBe(404);
    });

    it("should return product with all required fields", async () => {
      const mockProducts = getMockProducts();
      const productId = mockProducts[0].id;

      const response = await fetch(`${API_BASE}/products/${productId}`);
      const result = await response.json();

      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
      expect(result.data.description).toBeDefined();
      expect(result.data.sourceType).toBeDefined();
    });
  });

  describe("GET /api/v1/products/slug/:slug", () => {
    it("should return a product by slug", async () => {
      const mockProducts = getMockProducts();
      const productSlug = mockProducts[0].slug;

      const response = await fetch(`${API_BASE}/products/slug/${productSlug}`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(productSlug);
    });

    it("should return 404 for non-existent slug", async () => {
      const response = await fetch(`${API_BASE}/products/slug/non-existent-slug`);

      expect(response.status).toBe(404);
    });
  });

  describe("Product data structure", () => {
    it("should have valid product structure", async () => {
      const response = await fetch(`${API_BASE}/products?limit=1`);
      const result = await response.json();

      if (result.data.data.length > 0) {
        const product = result.data.data[0];

        expect(product.id).toBeDefined();
        expect(typeof product.id).toBe("string");
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe("string");
        expect(product.slug).toBeDefined();
        expect(typeof product.slug).toBe("string");
        expect(["TWITTER", "AMAZON"]).toContain(product.sourceType);
      }
    });

    it("should have valid price data", async () => {
      const response = await fetch(`${API_BASE}/products?limit=5`);
      const result = await response.json();

      result.data.data.forEach((product: { price: number | null; currency: string }) => {
        if (product.price !== null) {
          expect(typeof product.price).toBe("number");
          expect(product.price).toBeGreaterThanOrEqual(0);
        }
        expect(product.currency).toBeDefined();
      });
    });
  });
});
