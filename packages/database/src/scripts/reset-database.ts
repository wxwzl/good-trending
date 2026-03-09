/**
 * 数据库重置脚本
 * 清空所有数据并重新创建表结构
 *
 * 使用方法:
 * pnpm db:reset
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";

async function resetDatabase() {
  console.log("🗑️  开始重置数据库...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  try {
    // 获取数据库连接
    const client = await pool.connect();

    // 删除所有表（按照依赖顺序）
    console.log("📋 删除旧表...");

    const tablesToDrop = [
      // 先删除有外键依赖的表
      "crawler_log",
      "trend_rank",
      "product_social_stat",
      "product_appearance_stat",
      "category_heat_stat",
      "product_category",
      "product_history", // 旧表
      "product_topic",   // 旧表
      "product_tag",     // 旧表
      "tag",             // 旧表
      "trend",           // 旧表
      "topic",           // 旧表
      "category",        // 新表名
      "product",
    ];

    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✓ 已删除表: ${table}`);
      } catch (e) {
        console.log(`  ⚠ 表不存在或删除失败: ${table}`);
      }
    }

    // 删除枚举类型
    console.log("\n🎨 删除枚举类型...");
    const enumsToDrop = [
      "source_type",
      "crawler_status",
    ];

    for (const enumType of enumsToDrop) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE`);
        console.log(`  ✓ 已删除枚举: ${enumType}`);
      } catch (e) {
        console.log(`  ⚠ 枚举不存在: ${enumType}`);
      }
    }

    console.log("\n✅ 数据库已清空");
    console.log("\n📝 请运行以下命令重新创建表结构:");
    console.log("  pnpm db:push");
    console.log("\n或:");
    console.log("  pnpm db:migrate");

    client.release();
  } catch (error) {
    console.error("\n❌ 重置失败:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetDatabase();
