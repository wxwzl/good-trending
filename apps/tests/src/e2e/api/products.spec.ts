import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:3015";

test.describe("Health API", () => {
  test("should_return_health_status", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/health`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Response format: { data: { status, timestamp, uptime } }
    expect(data.data.status).toBe("ok");
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.uptime).toBeDefined();
  });

  test("should_return_valid_timestamp_format", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/health`);
    const data = await response.json();

    // Assert
    expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

test.describe("Products API", () => {
  test("should_list_products_with_pagination", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/products?page=1&limit=10`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // Response format: { data: { items: [...], total, page, limit, totalPages } }
    expect(data.data.items).toBeDefined();
    expect(Array.isArray(data.data.items)).toBe(true);
    expect(data.data.total).toBeDefined();
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(10);
    expect(data.data.totalPages).toBeDefined();
  });

  test("should_filter_products_by_discovered_from", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/products?discoveredFrom=AMAZON`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();

    // All products should have AMAZON discoveredFrom
    data.data.items.forEach((product: { discoveredFrom: string }) => {
      expect(product.discoveredFrom).toBe("AMAZON");
    });
  });

  test("should_return_single_product_by_ID", async ({ request }) => {
    // Arrange - First get a list of products
    const listResponse = await request.get(`${API_BASE}/api/v1/products?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.items.length > 0) {
      const productId = listData.data.items[0].id;

      // Act
      const response = await request.get(`${API_BASE}/api/v1/products/${productId}`);

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.id).toBe(productId);
      expect(data.data.name).toBeDefined();
    }
  });

  test("should_return_404_for_non_existent_product", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/products/non-existent-id`);

    // Assert
    expect(response.status()).toBe(404);
  });

  test("should_create_product_with_valid_data", async ({ request }) => {
    // Arrange
    const newProduct = {
      name: `Test Product ${Date.now()}`,
      slug: `test-product-${Date.now()}`,
      sourceUrl: `https://example.com/product-${Date.now()}`,
      amazonId: `amazon-${Date.now()}`,
      discoveredFrom: "AMAZON",
      description: "Test product description",
    };

    // Act
    const response = await request.post(`${API_BASE}/api/v1/products`, {
      data: newProduct,
    });

    // Assert
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.data.name).toBe(newProduct.name);
    expect(data.data.sourceUrl).toBe(newProduct.sourceUrl);
  });

  test("should_return_400_for_invalid_product_data", async ({ request }) => {
    // Arrange
    const invalidProduct = { name: "Missing required fields" };

    // Act
    const response = await request.post(`${API_BASE}/api/v1/products`, {
      data: invalidProduct,
    });

    // Assert
    expect(response.status()).toBe(400);
  });

  test("should_update_product_with_valid_data", async ({ request }) => {
    // Arrange - First get a list of products
    const listResponse = await request.get(`${API_BASE}/api/v1/products?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.items.length > 0) {
      const productId = listData.data.items[0].id;
      const updateData = { name: `Updated Product ${Date.now()}` };

      // Act
      const response = await request.put(`${API_BASE}/api/v1/products/${productId}`, {
        data: updateData,
      });

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.name).toBe(updateData.name);
    }
  });

  test("should_return_404_for_updating_non_existent_product", async ({ request }) => {
    // Arrange
    const updateData = { name: "Updated Name" };

    // Act
    const response = await request.put(`${API_BASE}/api/v1/products/non-existent-id`, {
      data: updateData,
    });

    // Assert
    expect(response.status()).toBe(404);
  });

  test("should_delete_product_successfully", async ({ request }) => {
    // Arrange - First create a product to delete
    const newProduct = {
      name: `Product to Delete ${Date.now()}`,
      slug: `product-to-delete-${Date.now()}`,
      sourceUrl: `https://example.com/delete-${Date.now()}`,
      amazonId: `delete-amazon-${Date.now()}`,
      discoveredFrom: "AMAZON",
    };

    const createResponse = await request.post(`${API_BASE}/api/v1/products`, {
      data: newProduct,
    });
    const createData = await createResponse.json();
    const productId = createData.data.id;

    // Act
    const response = await request.delete(`${API_BASE}/api/v1/products/${productId}`);

    // Assert
    expect(response.status()).toBe(204);
  });

  test("should_return_404_for_deleting_non_existent_product", async ({ request }) => {
    // Arrange & Act
    const response = await request.delete(`${API_BASE}/api/v1/products/non-existent-id`);

    // Assert
    expect(response.status()).toBe(404);
  });
});

test.describe("Trending API", () => {
  test("should_list_trending_products", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/trending?page=1&limit=10`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test("should_get_today_trending", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/trending/today`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();
  });

  test("should_get_this_week_trending", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/trending/this-week`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();
  });

  test("should_get_this_month_trending", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/trending/this-month`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();
  });

  test("should_include_trending_score_and_rank", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/trending?limit=5`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    if (data.data.items.length > 0) {
      const trend = data.data.items[0];
      expect(trend.score).toBeDefined();
      expect(typeof trend.score).toBe("number");
      expect(trend.rank).toBeDefined();
      expect(typeof trend.rank).toBe("number");
    }
  });

  test("should_get_trending_by_topic", async ({ request }) => {
    // Arrange - First get topics to find a valid slug
    const topicsResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const topicsData = await topicsResponse.json();

    if (topicsData.data.items.length > 0) {
      const topicSlug = topicsData.data.items[0].slug;

      // Act
      const response = await request.get(`${API_BASE}/api/v1/trending/topic/${topicSlug}`);

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      // API returns paginated trending products for the topic
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.total).toBeDefined();
    }
  });
});

test.describe("Topics API", () => {
  test("should_list_topics", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/topics`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.items).toBeDefined();
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test("should_return_single_topic_by_slug", async ({ request }) => {
    // Arrange - First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.items.length > 0) {
      const topicSlug = listData.data.items[0].slug;

      // Act
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}`);

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.slug).toBe(topicSlug);
    }
  });

  test("should_return_products_for_a_topic", async ({ request }) => {
    // Arrange - First get list of topics
    const listResponse = await request.get(`${API_BASE}/api/v1/topics`);
    const listData = await listResponse.json();

    if (listData.data.items.length > 0) {
      const topicSlug = listData.data.items[0].slug;

      // Act
      const response = await request.get(`${API_BASE}/api/v1/topics/${topicSlug}/products`);

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
    }
  });

  test("should_create_topic_with_valid_data", async ({ request }) => {
    // Arrange - API requires slug field
    const timestamp = Date.now();
    const newTopic = {
      name: `Test Topic ${timestamp}`,
      slug: `test-topic-${timestamp}`,
      description: "Test topic description",
    };

    // Act
    const response = await request.post(`${API_BASE}/api/v1/topics`, {
      data: newTopic,
    });

    // Assert
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.data.name).toBe(newTopic.name);
    expect(data.data.slug).toBe(newTopic.slug);
  });

  test("should_update_topic_with_valid_data", async ({ request }) => {
    // Arrange - First get a topic
    const listResponse = await request.get(`${API_BASE}/api/v1/topics?limit=1`);
    const listData = await listResponse.json();

    if (listData.data.items.length > 0) {
      const topicSlug = listData.data.items[0].slug;
      const updateData = { name: `Updated Topic ${Date.now()}` };

      // Act - Use PUT method for updates
      const response = await request.put(`${API_BASE}/api/v1/topics/${topicSlug}`, {
        data: updateData,
      });

      // Assert
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data.name).toBe(updateData.name);
    }
  });
});

test.describe("Search API", () => {
  test("should_search_products", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/search?q=apple`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.query).toBe("apple");
    expect(data.data.items).toBeDefined();
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test("should_return_400_for_empty_search_query", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/search?q=`);

    // Assert
    expect(response.status()).toBe(400);
  });

  test("should_return_400_for_missing_search_query", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/search`);

    // Assert
    expect(response.status()).toBe(400);
  });

  test("should_support_pagination_in_search", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/search?q=test&page=1&limit=5`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(5);
  });

  test("should_return_search_suggestions", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/search/suggestions?keyword=lap`);

    // Assert
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });
});

test.describe("API Response Format", () => {
  test("should_return_JSON_content_type", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/products`);

    // Assert
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("should_have_consistent_response_structure", async ({ request }) => {
    // Arrange & Act
    const response = await request.get(`${API_BASE}/api/v1/products`);
    const data = await response.json();

    // Assert - All API responses should have a data wrapper with items
    expect(data.data).toBeDefined();
    expect(data.data.items).toBeDefined();
    expect(data.data.total).toBeDefined();
    expect(data.data.page).toBeDefined();
    expect(data.data.limit).toBeDefined();
  });
});
