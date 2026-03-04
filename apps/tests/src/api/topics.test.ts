import { describe, it, expect, beforeEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";
import { getMockTopics } from "../mocks/handlers";

describe("Topics API", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/topics", () => {
    it("should return list of topics", async () => {
      const response = await fetch("/api/v1/topics");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should return paginated results", async () => {
      const response = await fetch("/api/v1/topics?page=1&limit=10");
      const data = await response.json();

      expect(data.page).toBe(1);
      expect(data.limit).toBe(10);
      expect(data.total).toBeDefined();
      expect(data.totalPages).toBeDefined();
    });
  });

  describe("GET /api/v1/topics/:slug", () => {
    it("should return a single topic by slug", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`/api/v1/topics/${topicSlug}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe(topicSlug);
      expect(data.name).toBeDefined();
    });

    it("should return 404 for non-existent topic", async () => {
      const response = await fetch("/api/v1/topics/non-existent-topic");

      expect(response.status).toBe(404);
    });

    it("should return topic with all required fields", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`/api/v1/topics/${topicSlug}`);
      const topic = await response.json();

      expect(topic.id).toBeDefined();
      expect(topic.name).toBeDefined();
      expect(topic.slug).toBeDefined();
    });
  });

  describe("GET /api/v1/topics/:slug/products", () => {
    it("should return products for a topic", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`/api/v1/topics/${topicSlug}/products`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topic).toBeDefined();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should return paginated products", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`/api/v1/topics/${topicSlug}/products?page=1&limit=5`);
      const data = await response.json();

      expect(data.page).toBe(1);
      expect(data.limit).toBe(5);
    });

    it("should include topic info with products", async () => {
      const mockTopics = getMockTopics();
      const topicSlug = mockTopics[0].slug;

      const response = await fetch(`/api/v1/topics/${topicSlug}/products`);
      const data = await response.json();

      expect(data.topic.slug).toBe(topicSlug);
    });
  });

  describe("Topic data structure", () => {
    it("should have valid topic structure", async () => {
      const response = await fetch("/api/v1/topics?limit=5");
      const data = await response.json();

      data.data.forEach((topic: { id: string; name: string; slug: string }) => {
        expect(topic.id).toBeDefined();
        expect(typeof topic.id).toBe("string");
        expect(topic.name).toBeDefined();
        expect(typeof topic.name).toBe("string");
        expect(topic.slug).toBeDefined();
        expect(typeof topic.slug).toBe("string");
      });
    });

    it("should have valid slug format", async () => {
      const response = await fetch("/api/v1/topics?limit=5");
      const data = await response.json();

      data.data.forEach((topic: { slug: string }) => {
        // Slug should be lowercase and contain only alphanumeric and hyphens
        expect(topic.slug).toMatch(/^[a-z0-9-]+$/);
      });
    });
  });
});
