/**
 * Database Integration Tests
 * Tests real database operations against PostgreSQL
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc } from "drizzle-orm";
import * as schema from "@good-trending/database/schema";

describe("Database Integration Tests", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
    }

    pool = new Pool({ connectionString, max: 5 });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  // ============================================
  // Connection Tests
  // ============================================

  describe("Connection Tests", () => {
    it("should_connect_to_database", async () => {
      const result = await pool.query("SELECT 1 as test");
      expect(result.rows[0].test).toBe(1);
    });

    it("should_verify_postgresql_server", async () => {
      const result = await pool.query("SELECT version()");
      expect(result.rows[0].version).toContain("PostgreSQL");
    });
  });

  // ============================================
  // Products Table Operations
  // ============================================

  describe("Products Table Operations", () => {
    const testProductIds: string[] = [];

    afterAll(async () => {
      for (const id of testProductIds) {
        await db
          .delete(schema.products)
          .where(eq(schema.products.id, id))
          .catch(() => {});
      }
    });

    it("should_insert_product_with_correct_fields", async () => {
      // Arrange
      const today = new Date().toISOString().split("T")[0];
      const timestamp = Date.now();
      const product = {
        name: "Test Product Integration",
        slug: `test-product-integration-${timestamp}`,
        description: "Integration test product",
        price: "99.99",
        currency: "USD",
        sourceUrl: `https://example.com/test-${timestamp}`,
        amazonId: `TEST-${timestamp}`,
        discoveredFrom: "AMAZON" as const,
        firstSeenAt: today,
      };

      // Act
      const [inserted] = await db.insert(schema.products).values(product).returning();
      testProductIds.push(inserted.id);

      // Assert
      expect(inserted.id).toBeDefined();
      expect(inserted.name).toBe(product.name);
      expect(inserted.discoveredFrom).toBe("AMAZON");
      expect(inserted.amazonId).toBe(product.amazonId);
    });

    it("should_select_product_by_id", async () => {
      if (testProductIds.length === 0) return;

      // Act
      const [product] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, testProductIds[0]));

      // Assert
      expect(product).toBeDefined();
      expect(product.id).toBe(testProductIds[0]);
    });

    it("should_select_product_by_slug", async () => {
      if (testProductIds.length === 0) return;

      // First, get the slug for the inserted product
      const [product] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, testProductIds[0]));

      if (!product) return;

      // Act
      const [found] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.slug, product.slug));

      // Assert
      expect(found).toBeDefined();
      expect(found.slug).toBe(product.slug);
    });

    it("should_update_product_name", async () => {
      if (testProductIds.length === 0) return;

      // Act
      const [updated] = await db
        .update(schema.products)
        .set({ name: "Updated Test Product", updatedAt: new Date() })
        .where(eq(schema.products.id, testProductIds[0]))
        .returning();

      // Assert
      expect(updated.name).toBe("Updated Test Product");
    });

    it("should_filter_products_by_discoveredFrom", async () => {
      // Act
      const products = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.discoveredFrom, "AMAZON"))
        .limit(10);

      // Assert
      expect(Array.isArray(products)).toBe(true);
      products.forEach((p) => {
        expect(p.discoveredFrom).toBe("AMAZON");
      });
    });

    it("should_count_total_products", async () => {
      // Act
      const products = await db.select().from(schema.products);

      // Assert
      expect(Array.isArray(products)).toBe(true);
    });
  });

  // ============================================
  // Categories Table Operations (formerly Topics)
  // ============================================

  describe("Categories Table Operations", () => {
    const testCategoryIds: string[] = [];
    const testSlugs: string[] = [];

    afterAll(async () => {
      for (const id of testCategoryIds) {
        await db
          .delete(schema.categories)
          .where(eq(schema.categories.id, id))
          .catch(() => {});
      }
    });

    it("should_insert_category", async () => {
      // Arrange
      const timestamp = Date.now();
      const slug = `test-category-${timestamp}`;
      testSlugs.push(slug);

      const category = {
        name: `Test Category ${timestamp}`,
        slug,
        description: "Integration test category",
      };

      // Act
      const [inserted] = await db.insert(schema.categories).values(category).returning();
      testCategoryIds.push(inserted.id);

      // Assert
      expect(inserted.id).toBeDefined();
      expect(inserted.slug).toBe(slug);
    });

    it("should_select_category_by_slug", async () => {
      if (testSlugs.length === 0) return;

      // Act
      const [category] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, testSlugs[0]));

      // Assert
      expect(category).toBeDefined();
      expect(category.slug).toBe(testSlugs[0]);
    });

    it("should_list_categories_with_limit", async () => {
      // Act
      const categories = await db.select().from(schema.categories).limit(10);

      // Assert
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  // ============================================
  // Trend Ranks Table Operations
  // ============================================

  describe("Trend Ranks Table Operations", () => {
    it("should_query_trend_ranks", async () => {
      // Act
      const today = new Date().toISOString().split("T")[0];
      const ranks = await db
        .select()
        .from(schema.trendRanks)
        .where(eq(schema.trendRanks.statDate, today))
        .orderBy(desc(schema.trendRanks.score))
        .limit(10);

      // Assert
      expect(Array.isArray(ranks)).toBe(true);
    });

    it("should_join_trend_ranks_with_products", async () => {
      // Act
      const results = await db
        .select({
          trend: schema.trendRanks,
          product: schema.products,
        })
        .from(schema.trendRanks)
        .innerJoin(schema.products, eq(schema.trendRanks.productId, schema.products.id))
        .limit(5);

      // Assert
      expect(Array.isArray(results)).toBe(true);
      results.forEach((r) => {
        expect(r.trend.productId).toBe(r.product.id);
      });
    });
  });

  // ============================================
  // Product-Category Relations
  // ============================================

  describe("Product-Category Relations", () => {
    it("should_query_product_categories", async () => {
      // Act
      const relations = await db.select().from(schema.productCategories).limit(10);

      // Assert
      expect(Array.isArray(relations)).toBe(true);
    });

    it("should_get_products_for_category", async () => {
      // Get a category first
      const categories = await db.select().from(schema.categories).limit(1);
      if (categories.length === 0) return;

      // Act
      const productsForCategory = await db
        .select({ product: schema.products })
        .from(schema.productCategories)
        .innerJoin(schema.products, eq(schema.productCategories.productId, schema.products.id))
        .where(eq(schema.productCategories.categoryId, categories[0].id))
        .limit(10);

      // Assert
      expect(Array.isArray(productsForCategory)).toBe(true);
    });
  });

  // ============================================
  // Transaction Tests
  // ============================================

  describe("Transaction Tests", () => {
    it("should_rollback_transaction_on_duplicate_source_url", async () => {
      const client = await pool.connect();
      const timestamp = Date.now();
      const sourceUrl = `https://tx-rollback-test-${timestamp}.example.com`;
      const today = new Date().toISOString().split("T")[0];

      try {
        await client.query("BEGIN");

        // Insert a product
        const insertResult = await client.query(
          `INSERT INTO "product" (name, slug, source_url, amazon_id, discovered_from, first_seen_at, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            "Transaction Test",
            `tx-test-${timestamp}`,
            sourceUrl,
            `TX-${timestamp}`,
            "AMAZON",
            today,
            "USD",
          ]
        );
        const productId = insertResult.rows[0].id;

        // Attempt duplicate source_url — should fail
        await expect(
          client.query(
            `INSERT INTO "product" (name, slug, source_url, amazon_id, discovered_from, first_seen_at, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              "Duplicate URL",
              `tx-dup-${timestamp}`,
              sourceUrl,
              `TX-DUP-${timestamp}`,
              "AMAZON",
              today,
              "USD",
            ]
          )
        ).rejects.toThrow();

        await client.query("ROLLBACK");

        // Verify first product was also rolled back
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
      let productId: string | undefined;
      const timestamp = Date.now();
      const today = new Date().toISOString().split("T")[0];

      try {
        await client.query("BEGIN");

        const insertResult = await client.query(
          `INSERT INTO "product" (name, slug, source_url, amazon_id, discovered_from, first_seen_at, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            "Commit Test",
            `commit-test-${timestamp}`,
            `https://commit-${timestamp}.example.com`,
            `CMT-${timestamp}`,
            "AMAZON",
            today,
            "USD",
          ]
        );
        productId = insertResult.rows[0].id;
        await client.query("COMMIT");

        // Verify product persists after commit
        const checkResult = await client.query(`SELECT id FROM "product" WHERE id = $1`, [
          productId,
        ]);
        expect(checkResult.rows.length).toBe(1);
      } finally {
        // Cleanup
        if (productId) {
          await client.query(`DELETE FROM "product" WHERE id = $1`, [productId]).catch(() => {});
        }
        client.release();
      }
    });
  });

  // ============================================
  // Performance Tests
  // ============================================

  describe("Performance Tests", () => {
    it("should_query_100_products_within_1_second", async () => {
      // Arrange
      const start = Date.now();

      // Act
      await db.select().from(schema.products).limit(100);

      // Assert
      expect(Date.now() - start).toBeLessThan(1000);
    });

    it("should_have_category_slug_index", async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT indexname FROM pg_indexes
           WHERE tablename = 'category' AND indexname = 'category_slug_idx'`
        );
        expect(result.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });

    it("should_have_product_slug_index", async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT indexname FROM pg_indexes
           WHERE tablename = 'product' AND indexname = 'product_slug_idx'`
        );
        expect(result.rows.length).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });
  });
});
