/**
 * 检查爬虫日志脚本
 * 查询数据库中保存的爬虫日志
 */

import "../src/loadEnv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { crawlerLogs } from "../src/schema";
import { desc } from "drizzle-orm";

async function checkCrawlerLogs() {
  console.log("🔍 查询爬虫日志...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // 查询所有爬虫日志
    const logs = await db
      .select({
        id: crawlerLogs.id,
        taskType: crawlerLogs.taskType,
        sourceType: crawlerLogs.sourceType,
        status: crawlerLogs.status,
        startTime: crawlerLogs.startTime,
        endTime: crawlerLogs.endTime,
        duration: crawlerLogs.duration,
        itemsFound: crawlerLogs.itemsFound,
        itemsSaved: crawlerLogs.itemsSaved,
        errors: crawlerLogs.errors,
        metadata: crawlerLogs.metadata,
        createdAt: crawlerLogs.createdAt,
      })
      .from(crawlerLogs)
      .orderBy(desc(crawlerLogs.createdAt));

    console.log(`📊 找到 ${logs.length} 条爬虫日志记录\n`);

    if (logs.length === 0) {
      console.log("⚠️ 暂无爬虫日志记录");
      return;
    }

    // 打印日志详情
    logs.forEach((log, index) => {
      console.log(`\n📋 记录 ${index + 1}:`);
      console.log(`  ID: ${log.id}`);
      console.log(`  任务类型: ${log.taskType}`);
      console.log(`  数据源: ${log.sourceType}`);
      console.log(`  状态: ${log.status}`);
      console.log(`  开始时间: ${log.startTime?.toISOString() || "N/A"}`);
      console.log(`  结束时间: ${log.endTime?.toISOString() || "N/A"}`);
      console.log(
        `  耗时: ${log.duration ? `${log.duration}ms (${(log.duration / 1000).toFixed(2)}s)` : "N/A"}`
      );
      console.log(`  发现项目数: ${log.itemsFound}`);
      console.log(`  保存项目数: ${log.itemsSaved}`);

      if (log.errors && Array.isArray(log.errors) && log.errors.length > 0) {
        console.log(`  错误数: ${log.errors.length}`);
        log.errors.forEach((err: any, i: number) => {
          console.log(`    错误 ${i + 1}: ${err.message || err}`);
        });
      }

      if (log.metadata) {
        console.log(`  元数据: ${JSON.stringify(log.metadata)}`);
      }

      console.log(`  创建时间: ${log.createdAt?.toISOString() || "N/A"}`);
      console.log("-".repeat(60));
    });

    // 统计信息
    console.log("\n📈 统计信息:");
    const completed = logs.filter((l) => l.status === "COMPLETED").length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    const running = logs.filter((l) => l.status === "RUNNING").length;

    console.log(`  完成: ${completed}`);
    console.log(`  失败: ${failed}`);
    console.log(`  运行中: ${running}`);

    const taskTypes = [...new Set(logs.map((l) => l.taskType))];
    console.log(`\n📋 任务类型分布:`);
    taskTypes.forEach((type) => {
      const count = logs.filter((l) => l.taskType === type).length;
      console.log(`  ${type}: ${count}`);
    });

    console.log("\n✅ 查询完成");
  } catch (error) {
    console.error("❌ 查询失败:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkCrawlerLogs();
