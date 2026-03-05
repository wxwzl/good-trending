import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:3005";

test.describe("Health API", () => {
  test("should return health status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Response format: { data: { status, timestamp, uptime } }
    expect(data.data.status).toBe("ok");
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.uptime).toBeDefined();
  });

  test("should return valid timestamp format", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    const data = await response.json();

    expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

test.describe("Products API", () => {
  test("should list products with pagination", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products?page=1&limit=10`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Response format: { data: { data: [...], total, page, limit, totalPages } }
    expect(data.data.data).toBeDefined();
    expect(Array.isArray(data.data.data)).toBe(true);
    expect(data.data.total).toBeDefined();
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(10);
    expect(data.data.totalPages).toBeDefined();
  });

  test("should filter products by source type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products?sourceType=AMAZON`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();

    // All products should have AMAZON source type
    data.data.data.forEach((product: { sourceType: string }) => {
      expect(product.sourceType).toBe("AMAZON");
    });
  });

  test("should return single product by ID", async ({ request }) => {
    // First get a list of products
    const listResponse = await request.get(`${API_BASE}/api/v1/products?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.data.length > 0) {
      const productId = listData.data.data[0].id;
      const response = await request.get(`${API_BASE}/api/v1/products/${productId}`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.id).toBe(productId);
      expect(data.data.name).toBeDefined();
    }
  });

  test("should return 404 for non-existent product", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products/non-existent-id`);

    expect(response.status()).toBe(404);
  });
});

test.describe("Trending API", () => {
  test("should list trending products", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?page=1&limit=10`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();
    expect(Array.isArray(data.data.data)).toBe(true);
  });

  test("should get daily trending", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending/daily`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();
  });

  test("should get weekly trending", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending/weekly`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();
  });

  test("should get monthly trending", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending/monthly`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();
  });

  test("should include trending score and rank", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/trending?limit=5`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    if (data.data.data.length > 0) {
      const trend = data.data.data[0];
      expect(trend.score).toBeDefined();
      expect(typeof trend.score).toBe("number");
      expect(trend.rank).toBeDefined();
      expect(typeof trend.rank).toBe("number");
    }
  });
});

test.describe("Topics API", () => {
  test("should list topics", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/topics`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.data).toBeDefined();
    expect(Array.isArray(data.data.data)).toBe(true);
  });

  test("should return single topic by slug", async ({ request }) => {
    // First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.data.length > 0) {
      const topicSlug = listData.data.data[0].slug;
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.slug).toBe(topicSlug);
    }
  });

  test("should return products for a topic", async ({ request }) => {
    // First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.data.length > 0) {
      const topicSlug = listData.data.data[0].slug;
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}/products`);

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.topic).toBeDefined();
      expect(data.data.data).toBeDefined();
    }
  });
});

test.describe("Search API", () => {
  test("should search products", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search?q=apple`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.query).toBe("apple");
    expect(data.data.data).toBeDefined();
    expect(Array.isArray(data.data.data)).toBe(true);
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
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(5);
  });

  test("should return search suggestions", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/search/suggestions?keyword=lap`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });
});

test.describe("API Response Format", () => {
  test("should return JSON content type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`);

    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("should have consistent response structure", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`);
    const data = await response.json();

    // All API responses should have a data wrapper
    expect(data.data).toBeDefined();
    expect(data.data.data).toBeDefined();
    expect(data.data.total).toBeDefined();
    expect(data.data.page).toBeDefined();
    expect(data.data.limit).toBeDefined();
  });
});
