import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockTopics } from "../mocks/handlers";

const API_BASE = "http://localhost:3005/api/v1";

describe("Topics API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/topics", () => {
    it("should_return_list_of_topics", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should_return_paginated_results", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=1&limit=10`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });

    // Boundary cases
    it("should_handle_page_zero_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=0`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_handle_negative_page_as_page_one", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=-1`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.page).toBe(1);
    });

    it("should_limit_maximum_page_size_to_100", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=500`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.limit).toBeLessThanOrEqual(100);
    });

    it("should_handle_large_page_number_gracefully", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?page=999999`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.data).toEqual([]);
    });
  });

  describe("GET /api/v1/topics/:slug", () => {
    it("should_return_a_single_topic_by_slug", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(topicSlug);
      expect(result.data.name).toBeDefined();
    });

    it("should_return_404_for_non_existent_topic", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic`);

      // Assert
      expect(response.status).toBe(404);
    });

    it("should_return_topic_with_all_required_fields", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}`);
      const result = await response.json();

      // Assert
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
    });
  });

  describe("GET /api/v1/topics/:slug/products", () => {
    it("should_return_products_for_a_topic", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/products`);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.topic).toBeDefined();
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should_return_paginated_products", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}/products?page=1&limit=5`);
      const result = await response.json();

      // Assert
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
    });

    it("should_return_404_for_non_existent_topic_products", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic/products`);

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/v1/topics", () => {
    it("should_create_topic_with_valid_data", async () => {
      // Arrange
      const newTopic = {
        name: "New Test Topic",
        description: "Test topic description",
      };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTopic),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(result.data.name).toBe(newTopic.name);
    });

    it("should_return_400_for_missing_name", async () => {
      // Arrange
      const invalidTopic = { description: "Missing name" };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidTopic),
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it("should_return_409_for_duplicate_slug", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const duplicateTopic = {
        name: mockTopics[0].name,
        slug: mockTopics[0].slug,
      };

      // Act
      const response = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicateTopic),
      });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe("PUT /api/v1/topics/:slug", () => {
    it("should_update_topic_with_valid_data", async () => {
      // Arrange
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;
      const updateData = { name: "Updated Topic Name" };

      // Act
      const response = await fetch(`${API_BASE}/topics/${topicSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.name).toBe(updateData.name);
    });

    it("should_return_404_for_non_existent_topic_update", async () => {
      // Arrange
      const updateData = { name: "Updated Name" };

      // Act
      const response = await fetch(`${API_BASE}/topics/non-existent-topic`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe("Topic data structure", () => {
    it("should_have_valid_topic_structure", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=5`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((topic: { id: string; name: string; slug: string }) => {
        expect(topic.id).toBeDefined();
        expect(typeof topic.id).toBe("string");
        expect(topic.name).toBeDefined();
        expect(typeof topic.name).toBe("string");
        expect(topic.slug).toBeDefined();
        expect(typeof topic.slug).toBe("string");
      });
    });

    it("should_have_valid_slug_format", async () => {
      // Arrange & Act
      const response = await fetch(`${API_BASE}/topics?limit=5`);
      const result = await response.json();

      // Assert
      result.data.data.forEach((topic: { slug: string }) => {
        expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });
  });
});