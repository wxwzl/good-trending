/**
 * 类目初始化脚本
 * 从 categoryKeys.json 导入类目数据到数据库
 *
 * 使用方法:
 * pnpm db:seed:categories
 */

import "./loadEnv";
import { join } from "path";
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "../src/schema";
import { eq } from "drizzle-orm";

/**
 * 生成 URL 友好的 slug
 */
function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      // 将空格和特殊字符替换为 -
      .replace(/[\s\p{P}\p{S}]+/gu, "-")
      // 移除连续的 -
      .replace(/-+/g, "-")
      // 移除开头和结尾的 -
      .replace(/^-|-$/g, "")
      .substring(0, 100)
  );
}

/**
 * 从 categoryKeys.json 加载类目数据
 */
function loadCategories(): string[] {
  const categoryFilePath = join(process.cwd(), "./category/categoryKeys.json");

  try {
    const fileContent = readFileSync(categoryFilePath, "utf-8");
    return JSON.parse(fileContent) as string[];
  } catch (error) {
    console.error("❌ 无法加载 categoryKeys.json 文件");
    console.error(`请确保文件存在: ${categoryFilePath}`);
    throw error;
  }
}

/**
 * 初始化类目数据
 */
async function seedCategories() {
  console.log("🌱 开始初始化类目数据...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  try {
    // 加载类目数据
    const categoryNames = loadCategories();
    console.log(`📂 从 categoryKeys.json 加载了 ${categoryNames.length} 个类目\n`);

    let createdCount = 0;
    let existingCount = 0;
    let failedCount = 0;

    for (const name of categoryNames) {
      const slug = generateSlug(name);

      try {
        // 检查是否已存在
        const existing = await db
          .select({ id: schema.categories.id })
          .from(schema.categories)
          .where(eq(schema.categories.slug, slug))
          .limit(1);

        if (existing.length > 0) {
          console.log(`  ⏭️  跳过已存在: ${name}`);
          existingCount++;
          continue;
        }

        // 创建新类目
        const categoryId = createId();
        await db.insert(schema.categories).values({
          id: categoryId,
          name,
          slug,
          description: `Amazon category: ${name}`,
          searchKeywords: name,
        });

        console.log(`  ✓ 创建类目: ${name}`);
        createdCount++;
      } catch (error) {
        console.error(`  ❌ 创建失败: ${name}`, error);
        failedCount++;
      }
    }

    console.log("\n📊 初始化结果:");
    console.log(`  创建成功: ${createdCount}`);
    console.log(`  已存在跳过: ${existingCount}`);
    console.log(`  创建失败: ${failedCount}`);

    if (failedCount === 0) {
      console.log("\n✅ 类目数据初始化完成!");
    } else {
      console.log("\n⚠️ 部分类目初始化失败");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ 初始化失败:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedCategories();
