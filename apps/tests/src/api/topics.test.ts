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
    it("should return list of topics", async () => {
      const response = await fetch(`${API_BASE}/topics`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should return paginated results", async () => {
      const response = await fetch(`${API_BASE}/topics?page=1&limit=10`);
      const result = await response.json();

      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.total).toBeDefined();
      expect(result.data.totalPages).toBeDefined();
    });
  });

  describe("GET /api/v1/topics/:slug", () => {
    it("should return a single topic by slug", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`${API_BASE}/topics/${topicSlug}`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.slug).toBe(topicSlug);
      expect(result.data.name).toBeDefined();
    });

    it("should return 404 for non-existent topic", async () => {
      const response = await fetch(`${API_BASE}/topics/non-existent-topic`);

      expect(response.status).toBe(404);
    });

    it("should return topic with all required fields", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`${API_BASE}/topics/${topicSlug}`);
      const result = await response.json();

      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBeDefined();
      expect(result.data.slug).toBeDefined();
    });
  });

  describe("GET /api/v1/topics/:slug/products", () => {
    it("should return products for a topic", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`${API_BASE}/topics/${topicSlug}/products`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.data.topic).toBeDefined();
      expect(result.data.data).toBeDefined();
      expect(Array.isArray(result.data.data)).toBe(true);
    });

    it("should return paginated products", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`${API_BASE}/topics/${topicSlug}/products?page=1&limit=5`);
      const result = await response.json();

      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(5);
    });
  });

  describe("Topic data structure", () => {
    it("should have valid topic structure", async () => {
      const response = await fetch(`${API_BASE}/topics?limit=5`);
      const result = await response.json();

      result.data.data.forEach((topic: { id: string; name: string; slug: string }) => {
        expect(topic.id).toBeDefined();
        expect(typeof topic.id).toBe("string");
        expect(topic.name).toBeDefined();
        expect(typeof topic.name).toBe("string");
        expect(topic.slug).toBeDefined();
        expect(typeof topic.slug).toBe("string");
      });
    });

    it("should have valid slug format", async () => {
      const response = await fetch(`${API_BASE}/topics?limit=5`);
      const result = await response.json();

      result.data.data.forEach((topic: { slug: string }) => {
        expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });
  });
});
