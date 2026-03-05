import { http, HttpResponse, delay } from "msw";
import {
  createProductFixtures,
  createTopicFixtures,
  createTrendFixtures,
  createPaginatedResponse,
} from "../fixtures";

// Mock data stores - using plural functions to create arrays
let mockProducts = createProductFixtures(20);
let mockTopics = createTopicFixtures(10);
let mockTrends = createTrendFixtures(10);

/**
 * Reset mock data to initial state
 */
export function resetMockData() {
  mockProducts = createProductFixtures(20);
  mockTopics = createTopicFixtures(10);
  mockTrends = createTrendFixtures(10);
}

/**
 * Get mock products (for testing purposes)
 */
export function getMockProducts() {
  return mockProducts;
}

/**
 * Get mock topics (for testing purposes)
 */
export function getMockTopics() {
  return mockTopics;
}

/**
 * Get mock trends (for testing purposes)
 */
export function getMockTrends() {
  return mockTrends;
}

/**
 * API handlers for MSW
 * Response format matches real API: { data: { data: [...], total, page, limit, totalPages } }
 */
export const handlers = [
  // Health check (root level) - matches real API response format
  http.get("*/health", async () => {
    await delay(100);
    return HttpResponse.json({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  }),

  // Health check (api level)
  http.get("*/api/v1/health", async () => {
    await delay(100);
    return HttpResponse.json({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  }),

  // Products API - response format: { data: { data: [...], total, page, limit, totalPages } }
  http.get("*/api/v1/products", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const sourceType = url.searchParams.get("sourceType");

    let filteredProducts = mockProducts;
    if (sourceType) {
      filteredProducts = mockProducts.filter((p) => p.sourceType === sourceType);
    }

    const start = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedProducts, filteredProducts.length, page, limit),
    });
  }),

  // Single product - response format: { data: { id, name, ... } }
  http.get("*/api/v1/products/:id", async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.id === params.id);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),

  http.get("*/api/v1/products/slug/:slug", async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.slug === params.slug);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),

  // Trending API
  http.get("*/api/v1/trending", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const period = url.searchParams.get("period") || "daily";

    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      data: {
        period,
        ...createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
      },
    });
  }),

  // Trending daily/weekly/monthly endpoints
  http.get("*/api/v1/trending/daily", async () => {
    await delay(100);
    return HttpResponse.json({
      data: createPaginatedResponse(mockTrends.slice(0, 10), mockTrends.length, 1, 10),
    });
  }),

  http.get("*/api/v1/trending/weekly", async () => {
    await delay(100);
    return HttpResponse.json({
      data: createPaginatedResponse(mockTrends.slice(0, 10), mockTrends.length, 1, 10),
    });
  }),

  http.get("*/api/v1/trending/monthly", async () => {
    await delay(100);
    return HttpResponse.json({
      data: createPaginatedResponse(mockTrends.slice(0, 10), mockTrends.length, 1, 10),
    });
  }),

  // Topics API
  http.get("*/api/v1/topics", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const start = (page - 1) * limit;
    const paginatedTopics = mockTopics.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedTopics, mockTopics.length, page, limit),
    });
  }),

  http.get("*/api/v1/topics/:slug", async ({ params }) => {
    await delay(100);
    const topic = mockTopics.find((t) => t.slug === params.slug);

    if (!topic) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: topic });
  }),

  http.get("*/api/v1/topics/:slug/products", async ({ params, request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const start = (page - 1) * limit;
    const paginatedProducts = mockProducts.slice(start, start + limit);

    return HttpResponse.json({
      data: {
        topic: mockTopics.find((t) => t.slug === params.slug),
        ...createPaginatedResponse(paginatedProducts, mockProducts.length, page, limit),
      },
    });
  }),

  // Search API
  http.get("*/api/v1/search", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    if (!query || query.trim().length === 0) {
      return new HttpResponse(JSON.stringify({ message: "Search query cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchResults = mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
    );

    const start = (page - 1) * limit;
    const paginatedResults = searchResults.slice(start, start + limit);

    return HttpResponse.json({
      data: {
        query,
        ...createPaginatedResponse(paginatedResults, searchResults.length, page, limit),
      },
    });
  }),

  // Search suggestions
  http.get("*/api/v1/search/suggestions", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword") || "";

    const suggestions = mockProducts
      .filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 5)
      .map((p) => p.name);

    return HttpResponse.json({ data: suggestions });
  }),
];
