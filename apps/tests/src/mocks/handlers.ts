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
 * Validate pagination parameters and return safe values
 */
function validatePagination(page?: string, limit?: string) {
  const safePage = Math.max(1, parseInt(page || "1") || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit || "10") || 10), 100);
  return { page: safePage, limit: safeLimit };
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

  // ============================================
  // Products API
  // ============================================

  // GET /api/v1/products - List products with pagination
  http.get("*/api/v1/products", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
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

  // GET /api/v1/products/:id - Get single product
  http.get("*/api/v1/products/:id", async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.id === params.id);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),

  // GET /api/v1/products/slug/:slug - Get product by slug
  http.get("*/api/v1/products/slug/:slug", async ({ params }) => {
    await delay(100);
    const product = mockProducts.find((p) => p.slug === params.slug);

    if (!product) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: product });
  }),

  // POST /api/v1/products - Create product
  http.post("*/api/v1/products", async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as {
      name: string;
      sourceUrl: string;
      sourceId: string;
      sourceType: string;
      description?: string;
      price?: number;
      currency?: string;
    };

    // Validate required fields
    if (!body.name || !body.sourceUrl || !body.sourceId || !body.sourceType) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 400,
          message: "Missing required fields",
          error: "Bad Request",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate sourceUrl
    const existingProduct = mockProducts.find((p) => p.sourceUrl === body.sourceUrl);
    if (existingProduct) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 409,
          message: "Product with this source URL already exists",
          error: "Conflict",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create new product
    const newProduct = {
      id: `new-${Date.now()}`,
      name: body.name,
      slug: body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      description: body.description || "",
      imageUrl: "https://example.com/image.jpg",
      sourceUrl: body.sourceUrl,
      sourceId: body.sourceId,
      sourceType: body.sourceType as "X_PLATFORM" | "AMAZON",
      price: body.price ?? null,
      currency: body.currency || "USD",
      rating: null,
      reviewCount: 0,
      viewCount: 0,
      trendingScore: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockProducts.push(newProduct);
    return HttpResponse.json({ data: newProduct }, { status: 201 });
  }),

  // PUT /api/v1/products/:id - Update product
  http.put("*/api/v1/products/:id", async ({ params, request }) => {
    await delay(100);
    const productIndex = mockProducts.findIndex((p) => p.id === params.id);

    if (productIndex === -1) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 404,
          message: "Product not found",
          error: "Not Found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updatedProduct = {
      ...mockProducts[productIndex],
      ...body,
      updatedAt: new Date(),
    };
    mockProducts[productIndex] = updatedProduct;

    return HttpResponse.json({ data: updatedProduct });
  }),

  // DELETE /api/v1/products/:id - Delete product
  http.delete("*/api/v1/products/:id", async ({ params }) => {
    await delay(100);
    const productIndex = mockProducts.findIndex((p) => p.id === params.id);

    if (productIndex === -1) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 404,
          message: "Product not found",
          error: "Not Found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    mockProducts.splice(productIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Trending API
  // ============================================

  // GET /api/v1/trending - Get trending products
  http.get("*/api/v1/trending", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
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

  // GET /api/v1/trending/daily
  http.get("*/api/v1/trending/daily", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
    });
  }),

  // GET /api/v1/trending/weekly
  http.get("*/api/v1/trending/weekly", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
    });
  }),

  // GET /api/v1/trending/monthly
  http.get("*/api/v1/trending/monthly", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
    });
  }),

  // GET /api/v1/trending/topic/:slug - Get trending by topic
  http.get("*/api/v1/trending/topic/:slug", async ({ params, request }) => {
    await delay(100);
    const topic = mockTopics.find((t) => t.slug === params.slug);

    if (!topic) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 404,
          message: "Topic not found",
          error: "Not Found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );
    const start = (page - 1) * limit;
    const paginatedTrends = mockTrends.slice(start, start + limit);

    return HttpResponse.json({
      data: {
        topic,
        ...createPaginatedResponse(paginatedTrends, mockTrends.length, page, limit),
      },
    });
  }),

  // ============================================
  // Topics API
  // ============================================

  // GET /api/v1/topics - List topics
  http.get("*/api/v1/topics", async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );

    const start = (page - 1) * limit;
    const paginatedTopics = mockTopics.slice(start, start + limit);

    return HttpResponse.json({
      data: createPaginatedResponse(paginatedTopics, mockTopics.length, page, limit),
    });
  }),

  // GET /api/v1/topics/:slug - Get single topic
  http.get("*/api/v1/topics/:slug", async ({ params }) => {
    await delay(100);
    const topic = mockTopics.find((t) => t.slug === params.slug);

    if (!topic) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({ data: topic });
  }),

  // GET /api/v1/topics/:slug/products - Get products by topic
  http.get("*/api/v1/topics/:slug/products", async ({ params, request }) => {
    await delay(100);
    const topic = mockTopics.find((t) => t.slug === params.slug);

    if (!topic) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 404,
          message: "Topic not found",
          error: "Not Found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );

    const start = (page - 1) * limit;
    const paginatedProducts = mockProducts.slice(start, start + limit);

    return HttpResponse.json({
      data: {
        topic,
        ...createPaginatedResponse(paginatedProducts, mockProducts.length, page, limit),
      },
    });
  }),

  // POST /api/v1/topics - Create topic
  http.post("*/api/v1/topics", async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as {
      name: string;
      slug?: string;
      description?: string;
    };

    if (!body.name) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 400,
          message: "Name is required",
          error: "Bad Request",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Check for duplicate slug
    if (mockTopics.find((t) => t.slug === slug)) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 409,
          message: "Topic with this slug already exists",
          error: "Conflict",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const newTopic = {
      id: `topic-${Date.now()}`,
      name: body.name,
      slug,
      description: body.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTopics.push(newTopic);
    return HttpResponse.json({ data: newTopic }, { status: 201 });
  }),

  // PUT /api/v1/topics/:slug - Update topic
  http.put("*/api/v1/topics/:slug", async ({ params, request }) => {
    await delay(100);
    const topicIndex = mockTopics.findIndex((t) => t.slug === params.slug);

    if (topicIndex === -1) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 404,
          message: "Topic not found",
          error: "Not Found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updatedTopic = {
      ...mockTopics[topicIndex],
      ...body,
      updatedAt: new Date(),
    };
    mockTopics[topicIndex] = updatedTopic;

    return HttpResponse.json({ data: updatedTopic });
  }),

  // ============================================
  // Search API
  // ============================================

  // GET /api/v1/search - Search products
  http.get("*/api/v1/search", async ({ request }) => {
    await delay(150);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const { page, limit } = validatePagination(
      url.searchParams.get("page") || undefined,
      url.searchParams.get("limit") || undefined
    );

    if (!query || query.trim().length === 0) {
      return new HttpResponse(
        JSON.stringify({
          statusCode: 400,
          message: "Search query cannot be empty",
          error: "Bad Request",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

  // GET /api/v1/search/suggestions - Get search suggestions
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
