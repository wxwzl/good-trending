import { describe, it, expect, beforeAll, afterAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

// Track created product IDs for cleanup
const createdProductIds: string[] = [];

async function createTestProduct(overrides: Record<string, unknown> = {}) {
  const timestamp = Date.now();
  const payload = {
    name: `Test Product ${timestamp}`,
    slug: `test-product-${timestamp}`,
    sourceUrl: `https://example.com/test-${timestamp}`,
    amazonId: `TEST-${timestamp}`,
    discoveredFrom: "AMAZON",
    description: "Integration test product",
    price: "99.99",
    currency: "USD",
    ...overrides,
  };

  const response = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 201) {
    const result = await response.json();
    createdProductIds.push(result.data.id);
    return result.data;
  }
  return null;
}

describe("Products API", () => {
  afterAll(async () => {
    // Cleanup all created test products
    for (const id of createdProductIds) {
      await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" }).catch(() => {});
    }
  });

  // ============================================
  // GET /api/v1/products
  // ============================================

  describe("GET /api/v1/products", () => {
    it("should_return_200_with_paginated_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toBeDefined();
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(typeof result.data.total).toBe("number");
      expect(typeof result.data.page).toBe("number");
      expect(typeof result.data.limit).toBe("number");
      expect(typeof result.data.totalPages).toBe("number");
    });

    it("should_respect_page_and_limit_params", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
      expect(result.data.items.length).toBeLessThanOrEqual(5);
    });

    it("should_return_correct_totalPages_calculation", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=10`);
      const result = await response.json();

      // Assert
      const expectedTotalPages = Math.ceil(result.data.total / result.data.limit);
      expect(result.data.totalPages).toBe(expectedTotalPages);
    });

    it("should_filter_products_by_X_PLATFORM_discoveredFrom", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?discoveredFrom=X_PLATFORM`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      result.data.items.forEach((product: { discoveredFrom: string }) => {
        expect(product.discoveredFrom).toBe("X_PLATFORM");
      });
    });

    it("should_filter_products_by_AMAZON_discoveredFrom", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?discoveredFrom=AMAZON`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      result.data.items.forEach((product: { discoveredFrom: string }) => {
        expect(product.discoveredFrom).toBe("AMAZON");
      });
    });

    it("should_filter_products_by_REDDIT_discoveredFrom", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?discoveredFrom=REDDIT`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      result.data.items.forEach((product: { discoveredFrom: string }) => {
        expect(product.discoveredFrom).toBe("REDDIT");
      });
    });

    it("should_handle_page_0_by_using_page_1", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBeGreaterThanOrEqual(1);
    });

    it("should_cap_limit_at_100_when_limit_exceeds_maximum", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_return_empty_items_for_out_of_range_page", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toEqual([]);
    });

    it("should_return_different_products_on_different_pages", async () => {
      // Arrange & Act
      const page1 = await fetch(`${API_BASE}/products?page=1&limit=5`).then((r) => r.json());
      const page2 = await fetch(`${API_BASE}/products?page=2&limit=5`).then((r) => r.json());

      // Assert — only check if data exists on both pages
      if (page1.data.items.length > 0 && page2.data.items.length > 0) {
        const ids1 = page1.data.items.map((p: { id: string }) => p.id);
        const ids2 = page2.data.items.map((p: { id: string }) => p.id);
        const overlap = ids1.filter((id: string) => ids2.includes(id));
        expect(overlap.length).toBe(0);
      }
    });
  });

  // ============================================
  // Product data structure validation
  // ============================================

  describe("Product data structure", () => {
    it("should_have_all_required_fields_in_list_items", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=1`);
      const result = await response.json();

      // Assert
      if (result.data.items.length > 0) {
        const product = result.data.items[0];
        expect(typeof product.id).toBe("string");
        expect(typeof product.name).toBe("string");
        expect(typeof product.slug).toBe("string");
        expect(["X_PLATFORM", "AMAZON", "REDDIT"]).toContain(product.discoveredFrom);
        expect(product.sourceUrl).toBeDefined();
        expect(product.firstSeenAt).toBeDefined();
        expect(product.createdAt).toBeDefined();
      }
    });

    it("should_have_valid_price_format_when_price_is_set", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=20`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((product: { price: string | null; currency: string }) => {
        if (product.price !== null && product.price !== undefined) {
          expect(typeof product.price).toBe("string");
          const parsed = parseFloat(product.price);
          expect(isNaN(parsed)).toBe(false);
          expect(parsed).toBeGreaterThanOrEqual(0);
        }
        expect(typeof product.currency).toBe("string");
      });
    });

    it("should_have_slug_in_lowercase_hyphenated_format", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products?limit=10`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((product: { slug: string }) => {
        expect(product.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });
  });

  // ============================================
  // GET /api/v1/products/:id
  // ============================================

  describe("GET /api/v1/products/:id", () => {
    let firstProductId: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/products?limit=1`);
      const result = await response.json();
      if (result.data.items.length > 0) {
        firstProductId = result.data.items[0].id;
      }
    });

    it("should_return_product_by_valid_id", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.id).toBe(firstProductId);
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
    });

    it("should_return_all_required_fields_for_single_product", async () => {
      if (!firstProductId) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/${firstProductId}`);
      const result = await response.json();

      // Assert
      const p = result.data;
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.slug).toBeDefined();
      expect(p.sourceUrl).toBeDefined();
      expect(p.discoveredFrom).toBeDefined();
      expect(p.firstSeenAt).toBeDefined();
      expect(p.createdAt).toBeDefined();
      expect(p.updatedAt).toBeDefined();
    });

    it("should_return_404_for_non_existent_product_id", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000000`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // GET /api/v1/products/slug/:slug
  // ============================================

  describe("GET /api/v1/products/slug/:slug", () => {
    let firstProductSlug: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/products?limit=1`);
      const result = await response.json();
      if (result.data.items.length > 0) {
        firstProductSlug = result.data.items[0].slug;
      }
    });

    it("should_return_product_by_valid_slug", async () => {
      if (!firstProductSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/slug/${firstProductSlug}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(firstProductSlug);
    });

    it("should_return_404_for_non_existent_slug", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/products/slug/non-existent-slug-000`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // POST /api/v1/products
  // ============================================

  describe("POST /api/v1/products", () => {
    it("should_create_product_and_return_201_with_data", async () => {
      // Arrange
      const timestamp = Date.now();
      const payload = {
        name: `Create Test ${timestamp}`,
        slug: `create-test-${timestamp}`,
        sourceUrl: `https://example.com/create-${timestamp}`,
        amazonId: `CREATE-${timestamp}`,
        discoveredFrom: "AMAZON",
      };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBe(payload.name);
      expect(result.data.sourceUrl).toBe(payload.sourceUrl);

      // Cleanup tracking
      if (result.data.id) createdProductIds.push(result.data.id);
    });

    it("should_return_400_when_required_fields_are_missing", async () => {
      // Arrange — missing sourceUrl, amazonId, discoveredFrom
      const payload = { name: "Missing Fields Product" };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_409_when_source_url_is_duplicate", async () => {
      // Arrange — create a product first
      const product = await createTestProduct();
      if (!product) return;

      const duplicatePayload = {
        name: "Duplicate URL Product",
        slug: `dup-url-${Date.now()}`,
        sourceUrl: product.sourceUrl,
        amazonId: `DUP-URL-${Date.now()}`,
        discoveredFrom: "AMAZON",
      };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      // Assert
      expect(response.status).toBe(409);
    });

    it("should_return_409_when_amazon_id_is_duplicate", async () => {
      // Arrange — create a product first
      const product = await createTestProduct();
      if (!product) return;

      const duplicatePayload = {
        name: "Duplicate AmazonId Product",
        slug: `dup-amazonid-${Date.now()}`,
        sourceUrl: `https://example.com/dup-amazonid-${Date.now()}`,
        amazonId: product.amazonId,
        discoveredFrom: "AMAZON",
      };

      // Act
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      // Assert
      expect(response.status).toBe(409);
    });

    it("should_persist_created_product_and_retrieve_it_by_id", async () => {
      // Arrange
      const product = await createTestProduct({ name: "Persist Test Product" });
      if (!product) return;

      // Act
      const response = await fetch(`${API_BASE}/products/${product.id}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.id).toBe(product.id);
      expect(result.data.name).toBe("Persist Test Product");
    });
  });

  // ============================================
  // PUT /api/v1/products/:id
  // ============================================

  describe("PUT /api/v1/products/:id", () => {
    it("should_update_product_name_and_return_updated_data", async () => {
      // Arrange
      const product = await createTestProduct();
      if (!product) return;

      const updatePayload = { name: "Updated Name via PUT" };

      // Act
      const response = await fetch(`${API_BASE}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.name).toBe(updatePayload.name);
    });

    it("should_return_404_when_updating_non_existent_product", async () => {
      // Arrange
      const updatePayload = { name: "Ghost Product Update" };

      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // DELETE /api/v1/products/:id
  // ============================================

  describe("DELETE /api/v1/products/:id", () => {
    it("should_delete_product_and_return_204", async () => {
      // Arrange — create a product specifically to delete
      const timestamp = Date.now();
      const response = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Delete Me ${timestamp}`,
          slug: `delete-me-${timestamp}`,
          sourceUrl: `https://example.com/delete-${timestamp}`,
          amazonId: `DEL-${timestamp}`,
          discoveredFrom: "AMAZON",
        }),
      });
      const created = await response.json();
      const productId = created.data?.id;
      if (!productId) return;

      // Act
      const deleteResponse = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
      });

      // Assert
      expect(deleteResponse.status).toBe(204);
    });

    it("should_return_404_when_product_is_already_deleted", async () => {
      // Arrange — create and delete a product
      const product = await createTestProduct();
      if (!product) return;

      // Remove from cleanup list since we delete it here
      const idx = createdProductIds.indexOf(product.id);
      if (idx > -1) createdProductIds.splice(idx, 1);

      await fetch(`${API_BASE}/products/${product.id}`, { method: "DELETE" });

      // Act — delete again
      const response = await fetch(`${API_BASE}/products/${product.id}`, {
        method: "DELETE",
      });

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_return_404_for_non_existent_product_delete", async () => {
      // Act
      const response = await fetch(`${API_BASE}/products/non-existent-id-000`, {
        method: "DELETE",
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
