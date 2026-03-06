/**
 * 清理测试数据脚本
 */
import { db } from "./index";
import { topics } from "./schema";
import { like, or } from "drizzle-orm";

async function cleanup() {
  try {
    console.log("🧹 开始清理测试数据...");

    // 删除测试分类（名字以 "Test Topic" 或 "Updated Topic" 开头的）
    const deletedTopics = await db
      .delete(topics)
      .where(or(like(topics.name, "Test Topic%"), like(topics.name, "Updated Topic%")))
      .returning({ id: topics.id, name: topics.name, slug: topics.slug });

    console.log(`✅ 删除了 ${deletedTopics.length} 个测试分类:`);
    deletedTopics.forEach((row) => {
      console.log(`   - ${row.name} (slug: ${row.slug})`);
    });

    console.log("\n🎉 清理完成！");
  } catch (error) {
    console.error("❌ 清理失败:", error);
  } finally {
    process.exit(0);
  }
}

cleanup();
