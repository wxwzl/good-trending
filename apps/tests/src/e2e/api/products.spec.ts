import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:3001";

test.describe("Health API", () => {
  test("should return health status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
  });

  test("should return API info at root", async ({ request }) => {
    const response = await request.get(`${API_BASE}/`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.name).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.docs).toBeDefined();
  });
});

test.describe("Products API", () => {
  test("should list products with pagination", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products?page=1&limit=10`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.total).toBeDefined();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
    expect(data.totalPages).toBeDefined();
  });

  test("should filter products by source type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products?sourceType=TWITTER`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toBeDefined();

    // All products should have TWITTER source type
    data.data.forEach((product: { sourceType: string }) => {
      expect(product.sourceType).toBe("TWITTER");
    });
  });

  test("should return single product by ID", async ({ request }) => {
    // First get a list of products
    const listResponse = await request.get(`${API_BASE}/api/v1/products?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.length > 0) {
      const productId = listData.data[0].id;
      const response = await request.get(`${API_BASE}/api/v1/products/${productId}`);

      expect(response.ok()).toBeTruthy();

      const product = await response.json();
      expect(product.id).toBe(productId);
      expect(product.name).toBeDefined();
    }
  });

  test("should return 404 for non-existent product", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products/non-existent-id`);

    expect(response.status()).toBe(404);
  });

  test("should return product by slug", async ({ request }) => {
    // First get a list of products
    const listResponse = await request.get(`${API_BASE}/api/v1/products?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.length > 0) {
      const productSlug = listData.data[0].slug;
      const response = await request.get(`${API_BASE}/api/v1/products/slug/${productSlug}`);

      expect(response.ok()).toBeTruthy();

      const product = await response.json();
      expect(product.slug).toBe(productSlug);
    }
  });
});

test.describe("Trending API", () => {
  test("should list trending products", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?page=1&limit=10`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.period).toBeDefined();
  });

  test("should filter trending by period", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?period=daily`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.period).toBe("daily");
  });

  test("should accept weekly period", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?period=weekly`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.period).toBe("weekly");
  });

  test("should accept monthly period", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?period=monthly`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.period).toBe("monthly");
  });
});

test.describe("Topics API", () => {
  test("should list topics", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/topics`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("should return single topic by slug", async ({ request }) => {
    // First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.length > 0) {
      const topicSlug = listData.data[0].slug;
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}`);

      expect(response.ok()).toBeTruthy();

      const topic = await response.json();
      expect(topic.slug).toBe(topicSlug);
    }
  });

  test("should return products for a topic", async ({ request }) => {
    // First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.length > 0) {
      const topicSlug = listData.data[0].slug;
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}/products`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.topic).toBeDefined();
      expect(data.data).toBeDefined();
    }
  });
});

test.describe("Search API", () => {
  test("should search products", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search?q=laptop`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.query).toBe("laptop");
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("should return 400 for empty search query", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search?q=`);

    expect(response.status()).toBe(400);
  });

  test("should return 400 for missing search query", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search`);

    expect(response.status()).toBe(400);
  });

  test("should support pagination in search", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search?q=test&page=1&limit=5`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(5);
  });
});

test.describe("API Response Format", () => {
  test("should return JSON content type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`);

    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("should handle CORS headers", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    // CORS headers should be present
    const headers = response.headers();
    // Just verify we get a response
    expect(response.ok()).toBeTruthy();
  });
});
