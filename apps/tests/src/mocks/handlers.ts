import { http, HttpResponse, delay } from "msw";
import {
  createProductFixture,
  createTopicFixture,
  createTrendFixture,
  createPaginatedResponse,
} from "../fixtures";

const API_BASE = "/api/v1";

// Mock data stores
let mockProducts = createProductFixture(20);
let mockTopics = createTopicFixture(10);
let mockTrends = createTrendFixture(10);

/**
 * Reset mock data to initial state
 */
export function resetMockData() {
  mockProducts = createProductFixture(20);
  mockTopics = createTopicFixture(10);
  mockTrends = createTrendFixture(10);
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
 */
export const handlers = [
  // Health check
  http.get(`${API_BASE}/health`, async () => {
    await delay(100);
    return HttpResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }),

  // Products API
  http.get(`${API_BASE}/products`, async ({ request }) => {
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

    return HttpResponse.json(
      createPaginatedResponse(paginatedProducts, filteredProducts.length, page, limit)
    );
  }),

  http.get(`${API_BASE}/products/:id`, async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.id === params.id);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(product);
  }),

  http.get(`${API_BASE}/products/slug/:slug`, async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.slug === params.slug);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(product);
  }),

  // Trending API
  http.get(`${API_BASE}/trending`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const period = url.searchParams.get("period") || "daily";

    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      period,
      ...createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
    });
  }),

  // Topics API
  http.get(`${API_BASE}/topics`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const start = (page - 1) * limit;
    const paginatedTopics = mockTopics.slice(start, start + limit);

    return HttpResponse.json(
      createPaginatedResponse(paginatedTopics, mockTopics.length, page, limit)
    );
  }),

  http.get(`${API_BASE}/topics/:slug`, async ({ params }) => {
    await delay(100);
    const topic = mockTopics.find((t) => t.slug === params.slug);

    if (!topic) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(topic);
  }),

  http.get(`${API_BASE}/topics/:slug/products`, async ({ params, request }) => {
    await delay(100);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const start = (page - 1) * limit;
    const paginatedProducts = mockProducts.slice(start, start + limit);

    return HttpResponse.json({
      topic: mockTopics.find((t) => t.slug === params.slug),
      ...createPaginatedResponse(paginatedProducts, mockProducts.length, page, limit),
    });
  }),

  // Search API
  http.get(`${API_BASE}/search`, async ({ request }) => {
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
      query,
      ...createPaginatedResponse(paginatedResults, searchResults.length, page, limit),
    });
  }),
];
