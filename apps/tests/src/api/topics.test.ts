import { describe, it, expect, beforeAll, afterAll } from "vitest";

const API_BASE = `${process.env.API_URL || "http://localhost:3015"}/api/v1`;

// Track created topic slugs for cleanup
const createdTopicSlugs: string[] = [];

async function createTestTopic(overrides: Record<string, unknown> = {}) {
  const timestamp = Date.now();
  const slug = `test-topic-${timestamp}`;
  const payload = {
    name: `Test Topic ${timestamp}`,
    slug,
    description: "Integration test topic",
    ...overrides,
  };

  const response = await fetch(`${API_BASE}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 201) {
    const result = await response.json();
    createdTopicSlugs.push(result.data.slug);
    return result.data;
  }
  return null;
}

describe("Topics API", () => {
  afterAll(async () => {
    // Cleanup all created test topics
    for (const slug of createdTopicSlugs) {
      await fetch(`${API_BASE}/topics/${slug}`, { method: "DELETE" }).catch(() => {});
    }
  });

  // ============================================
  // GET /api/v1/topics
  // ============================================

  describe("GET /api/v1/topics", () => {
    it("should_return_200_with_paginated_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics`);
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
      const response = await fetch(`${API_BASE}/topics?page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
      expect(result.data.items.length).toBeLessThanOrEqual(5);
    });

    it("should_handle_page_0_by_normalizing_to_page_1", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBeGreaterThanOrEqual(1);
    });

    it("should_cap_limit_at_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_return_empty_items_for_out_of_range_page", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.items).toEqual([]);
    });

    it("should_calculate_totalPages_correctly", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=10`);
      const result = await response.json();

      // Assert
      const expected = Math.ceil(result.data.total / result.data.limit);
      expect(result.data.totalPages).toBe(expected);
    });
  });

  // ============================================
  // Topic data structure validation
  // ============================================

  describe("Topic data structure", () => {
    it("should_have_all_required_fields", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=5`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((topic: Record<string, unknown>) => {
        expect(typeof topic.id).toBe("string");
        expect(typeof topic.name).toBe("string");
        expect(typeof topic.slug).toBe("string");
        expect(typeof topic.productCount).toBe("number");
        expect(topic.productCount as number).toBeGreaterThanOrEqual(0);
      });
    });

    it("should_have_slug_in_lowercase_hyphenated_format", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=10`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((topic: { slug: string }) => {
        expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it("should_have_optional_searchKeywords_as_string_when_present", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=10`);
      const result = await response.json();

      // Assert
      result.data.items.forEach((topic: { searchKeywords?: unknown }) => {
        if (topic.searchKeywords !== null && topic.searchKeywords !== undefined) {
          expect(typeof topic.searchKeywords).toBe("string");
        }
      });
    });
  });

  // ============================================
  // GET /api/v1/topics/:slug
  // ============================================

  describe("GET /api/v1/topics/:slug", () => {
    let firstTopicSlug: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/topics?limit=1`);
      const result = await response.json();
      if (result.data.items.length > 0) {
        firstTopicSlug = result.data.items[0].slug;
      }
    });

    it("should_return_topic_by_valid_slug", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(firstTopicSlug);
      expect(result.data.name).toBeDefined();
    });

    it("should_return_all_required_fields_for_single_topic", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}`);
      const result = await response.json();

      // Assert
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
      expect(typeof result.data.productCount).toBe("number");
    });

    it("should_return_404_for_non_existent_topic_slug", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic-000`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // GET /api/v1/topics/:slug/products
  // ============================================

  describe("GET /api/v1/topics/:slug/products", () => {
    let firstTopicSlug: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/topics?limit=1`);
      const result = await response.json();
      if (result.data.items.length > 0) {
        firstTopicSlug = result.data.items[0].slug;
      }
    });

    it("should_return_products_for_valid_topic", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/products`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(typeof result.data.total).toBe("number");
    });

    it("should_support_pagination_for_topic_products", async () => {
      if (!firstTopicSlug) return;

      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/${firstTopicSlug}/products?page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
    });

    it("should_return_404_for_non_existent_topic_products", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic-000/products`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // ============================================
  // POST /api/v1/topics
  // ============================================

  describe("POST /api/v1/topics", () => {
    it("should_create_topic_and_return_201_with_data", async () => {
      // Arrange
      const timestamp = Date.now();
      const payload = {
        name: `New Topic ${timestamp}`,
        slug: `new-topic-${timestamp}`,
        description: "Created in integration test",
      };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.name).toBe(payload.name);
      expect(result.data.slug).toBe(payload.slug);

      if (result.data.slug) createdTopicSlugs.push(result.data.slug);
    });

    it("should_return_400_when_name_is_missing", async () => {
      // Arrange
      const payload = { slug: "missing-name", description: "No name" };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_409_when_slug_is_duplicate", async () => {
      // Arrange — create a topic first
      const topic = await createTestTopic();
      if (!topic) return;

      const duplicatePayload = {
        name: "Another Topic Same Slug",
        slug: topic.slug,
      };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  // ============================================
  // PATCH /api/v1/topics/:slug
  // ============================================

  describe("PATCH /api/v1/topics/:slug", () => {
    it("should_update_topic_name_and_return_updated_data", async () => {
      // Arrange
      const topic = await createTestTopic();
      if (!topic) return;

      const updatePayload = { name: `Updated Topic ${Date.now()}` };

      // Act
      const response = await fetch(`${API_BASE}/topics/${topic.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.name).toBe(updatePayload.name);
    });

    it("should_preserve_unchanged_fields_on_partial_update", async () => {
      // Arrange
      const topic = await createTestTopic({ description: "Original description" });
      if (!topic) return;

      const updatePayload = { name: `Only Name Changed ${Date.now()}` };

      // Act
      const response = await fetch(`${API_BASE}/topics/${topic.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.name).toBe(updatePayload.name);
      // slug should be unchanged
      expect(result.data.slug).toBe(topic.slug);
    });

    it("should_return_404_when_updating_non_existent_topic", async () => {
      // Arrange
      const updatePayload = { name: "Ghost Topic Update" };

      // Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic-000`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
