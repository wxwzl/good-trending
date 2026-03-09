/**
 * 检查商品数据脚本
 * 查询数据库中的商品记录
 */

import "../src/loadEnv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { products, categories, productCategories } from "../src/schema";
import { desc, eq, sql } from "drizzle-orm";

async function checkProducts() {
  console.log("🔍 查询商品数据...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // 查询所有商品
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        currency: products.currency,
        amazonId: products.amazonId,
        sourceUrl: products.sourceUrl,
        discoveredFrom: products.discoveredFrom,
        firstSeenAt: products.firstSeenAt,
        createdAt: products.createdAt,
      })
      .from(products)
      .orderBy(desc(products.createdAt));

    console.log(`📦 找到 ${allProducts.length} 个商品\n`);

    if (allProducts.length === 0) {
      console.log("⚠️ 数据库中没有商品记录");
      return;
    }

    // 打印商品详情
    allProducts.forEach((product, index) => {
      console.log(`\n📋 商品 ${index + 1}:`);
      console.log(`  ID: ${product.id}`);
      console.log(`  名称: ${product.name}`);
      console.log(`  Slug: ${product.slug}`);
      console.log(`  价格: ${product.price} ${product.currency}`);
      console.log(`  Amazon ID: ${product.amazonId}`);
      console.log(`  来源: ${product.discoveredFrom}`);
      console.log(`  首次发现: ${product.firstSeenAt}`);
      console.log(`  创建时间: ${product.createdAt?.toISOString() || "N/A"}`);
      console.log("-".repeat(60));
    });

    // 统计信息
    console.log("\n📈 统计信息:");

    // 按来源统计
    const sources = [...new Set(allProducts.map((p) => p.discoveredFrom))];
    console.log("\n  数据来源分布:");
    sources.forEach((source) => {
      const count = allProducts.filter((p) => p.discoveredFrom === source).length;
      console.log(`    ${source}: ${count}`);
    });

    // 价格范围
    const prices = allProducts
      .map((p) => (p.price ? parseFloat(p.price) : null))
      .filter((p): p is number => p !== null);

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      console.log(`\n  价格统计:`);
      console.log(`    最低: $${minPrice.toFixed(2)}`);
      console.log(`    最高: $${maxPrice.toFixed(2)}`);
      console.log(`    平均: $${avgPrice.toFixed(2)}`);
    }

    // 查询类目关联
    console.log("\n🔗 查询商品-类目关联...");
    const productCategoryLinks = await db
      .select({
        productName: products.name,
        categoryName: categories.name,
      })
      .from(productCategories)
      .innerJoin(products, eq(productCategories.productId, products.id))
      .innerJoin(categories, eq(productCategories.categoryId, categories.id));

    console.log(`  共有 ${productCategoryLinks.length} 个商品-类目关联`);

    if (productCategoryLinks.length > 0) {
      console.log("\n  关联详情:");
      productCategoryLinks.forEach((link) => {
        console.log(`    ${link.productName} -> ${link.categoryName}`);
      });
    }

    // 查询类目统计
    console.log("\n📊 类目分布:");
    const categoryCounts = await db
      .select({
        categoryName: categories.name,
        count: sql<number>`count(${productCategories.productId})`,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .groupBy(categories.id, categories.name);

    categoryCounts.forEach((cat) => {
      console.log(`    ${cat.categoryName}: ${cat.count} 个商品`);
    });

    console.log("\n✅ 查询完成");
  } catch (error) {
    console.error("❌ 查询失败:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
checkProducts();
