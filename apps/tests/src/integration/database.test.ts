/**
 * Database Integration Tests
 * Tests real database operations against PostgreSQL
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@good-trending/database/schema";
import { closePool } from "@good-trending/database/client";

describe("Database Integration Tests", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    // Create connection pool for tests
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
    }

    pool = new Pool({
      connectionString,
      max: 5,
    });

    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("Connection Tests", () => {
    it("should_connect_to_database", async () => {
      const result = await pool.query("SELECT 1 as test");
      expect(result.rows[0].test).toBe(1);
    });

    it("should_check_database_version", async () => {
      const result = await pool.query("SELECT version()");
      expect(result.rows[0].version).toContain("PostgreSQL");
    });
  });

  describe("Products Table Operations", () => {
    const testProductIds: string[] = [];

    afterAll(async () => {
      // Cleanup test products
      if (testProductIds.length > 0) {
        await db.delete(schema.products).where(eq(schema.products.id, testProductIds[0] as any));
      }
    });

    it("should_insert_product", async () => {
      const product = {
        name: "Test Product Integration",
        description: "Integration test product",
        image: "https://example.com/image.jpg",
        price: "99.99",
        currency: "USD",
        sourceUrl: `https://example.com/test-${Date.now()}`,
        sourceId: `test-${Date.now()}`,
        sourceType: "AMAZON" as const,
      };

      const [inserted] = await db.insert(schema.products).values(product).returning();
      testProductIds.push(inserted.id);

      expect(inserted.id).toBeDefined();
      expect(inserted.name).toBe(product.name);
      expect(inserted.price).toBe(product.price);
    });

    it("should_select_product_by_id", async () => {
      if (testProductIds.length === 0) {
        // Create a product first
        const product = {
          name: "Test Product for Select",
          sourceUrl: `https://example.com/select-${Date.now()}`,
          sourceId: `select-${Date.now()}`,
          sourceType: "AMAZON" as const,
        };
        const [inserted] = await db.insert(schema.products).values(product).returning();
        testProductIds.push(inserted.id);
      }

      const [product] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, testProductIds[0] as any));

      expect(product).toBeDefined();
      expect(product.id).toBe(testProductIds[0]);
    });

    it("should_update_product", async () => {
      if (testProductIds.length === 0) {
        // Skip if no test product
        return;
      }

      const newName = "Updated Test Product";
      const [updated] = await db
        .update(schema.products)
        .set({ name: newName, updatedAt: new Date() })
        .where(eq(schema.products.id, testProductIds[0] as any))
        .returning();

      expect(updated.name).toBe(newName);
    });

    it("should_filter_products_by_source_type", async () => {
      const products = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.sourceType, "AMAZON"))
        .limit(10);

      expect(Array.isArray(products)).toBe(true);
      products.forEach((p) => {
        expect(p.sourceType).toBe("AMAZON");
      });
    });

    it("should_count_products", async () => {
      const result = await db.select({ count: schema.products.id }).from(schema.products);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Topics Table Operations", () => {
    const testTopicIds: string[] = [];
    const testSlugs: string[] = [];

    afterAll(async () => {
      // Cleanup test topics
      for (const id of testTopicIds) {
        await db.delete(schema.topics).where(eq(schema.topics.id, id as any));
      }
    });

    it("should_insert_topic", async () => {
      const slug = `test-topic-${Date.now()}`;
      testSlugs.push(slug);

      const topic = {
        name: "Test Topic Integration",
        slug,
        description: "Integration test topic",
      };

      const [inserted] = await db.insert(schema.topics).values(topic).returning();
      testTopicIds.push(inserted.id);

      expect(inserted.id).toBeDefined();
      expect(inserted.slug).toBe(slug);
    });

    it("should_select_topic_by_slug", async () => {
      if (testSlugs.length === 0) {
        // Skip if no test topic
        return;
      }

      const [topic] = await db
        .select()
        .from(schema.topics)
        .where(eq(schema.topics.slug, testSlugs[0]));

      expect(topic).toBeDefined();
      expect(topic.slug).toBe(testSlugs[0]);
    });

    it("should_list_topics_with_pagination", async () => {
      const topics = await db.select().from(schema.topics).limit(10);

      expect(Array.isArray(topics)).toBe(true);
    });
  });

  describe("Trends Table Operations", () => {
    it("should_query_trending_products", async () => {
      // Get trending products for today
      const today = new Date().toISOString().split("T")[0];

      const trends = await db
        .select()
        .from(schema.trends)
        .where(eq(schema.trends.date, today))
        .orderBy(desc(schema.trends.score))
        .limit(10);

      expect(Array.isArray(trends)).toBe(true);
    });

    it("should_join_trends_with_products", async () => {
      // Join trends with products
      const results = await db
        .select({
          trend: schema.trends,
          product: schema.products,
        })
        .from(schema.trends)
        .innerJoin(schema.products, eq(schema.trends.productId, schema.products.id))
        .limit(5);

      expect(Array.isArray(results)).toBe(true);
      results.forEach((r) => {
        expect(r.trend.productId).toBe(r.product.id);
      });
    });
  });

  describe("Product-Topic Relations", () => {
    it("should_query_product_topics", async () => {
      // Query product-topic relationships
      const relations = await db.select().from(schema.productTopics).limit(10);

      expect(Array.isArray(relations)).toBe(true);
    });

    it("should_get_products_for_topic", async () => {
      // Get a topic first
      const topics = await db.select().from(schema.topics).limit(1);

      if (topics.length > 0) {
        const productsForTopic = await db
          .select({
            product: schema.products,
          })
          .from(schema.productTopics)
          .innerJoin(schema.products, eq(schema.productTopics.productId, schema.products.id))
          .where(eq(schema.productTopics.topicId, topics[0].id))
          .limit(10);

        expect(Array.isArray(productsForTopic)).toBe(true);
      }
    });
  });

  describe("Transaction Tests", () => {
    it("should_rollback_transaction_on_error", async () => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Insert a product
        const insertResult = await client.query(
          `INSERT INTO "product" (name, source_url, source_id, source_type, currency)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          ["Transaction Test", "https://tx-test.example.com", "tx-test", "AMAZON", "USD"]
        );

        const productId = insertResult.rows[0].id;

        // Force an error - duplicate source_url
        await expect(
          client.query(
            `INSERT INTO "product" (name, source_url, source_id, source_type, currency)
             VALUES ($1, $2, $3, $4, $5)`,
            ["Another", "https://tx-test.example.com", "another", "AMAZON", "USD"]
          )
        ).rejects.toThrow();

        // Rollback
        await client.query("ROLLBACK");

        // Verify product doesn't exist
        const checkResult = await client.query(`SELECT id FROM "product" WHERE id = $1`, [
          productId,
        ]);

        expect(checkResult.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });

    it("should_commit_transaction_successfully", async () => {
      const client = await pool.connect();
      let productId: string;

      try {
        await client.query("BEGIN");

        const insertResult = await client.query(
          `INSERT INTO "product" (name, source_url, source_id, source_type, currency)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            "Commit Test",
            `https://commit-test-${Date.now()}.example.com`,
            "commit-test",
            "AMAZON",
            "USD",
          ]
        );

        productId = insertResult.rows[0].id;
        await client.query("COMMIT");

        // Verify product exists
        const checkResult = await client.query(`SELECT id FROM "product" WHERE id = $1`, [
          productId,
        ]);

        expect(checkResult.rows.length).toBe(1);

        // Cleanup
        await client.query(`DELETE FROM "product" WHERE id = $1`, [productId]);
      } finally {
        client.release();
      }
    });
  });

  describe("Performance Tests", () => {
    it("should_query_products_within_time_limit", async () => {
      const start = Date.now();

      await db.select().from(schema.products).limit(100);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should_use_index_for_slug_lookup", async () => {
      const client = await pool.connect();

      try {
        // Check if index exists
        const indexResult = await client.query(
          `SELECT indexname FROM pg_indexes
           WHERE tablename = 'topic' AND indexname = 'topic_slug_idx'`
        );

        expect(indexResult.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });
  });
});
