import dotenv from "dotenv";
import path from "path";

// 加载环境变量（从项目根目录的 .env.development）
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.development") });

import { db } from "@good-trending/database";
import { crawlerLogs } from "@good-trending/database";
import { sql } from "drizzle-orm";

async function checkCrawlerLogs() {
  try {
    console.log("=== 爬虫日志详细检查 ===\n");

    // 查询所有失败的爬虫任务
    const failedLogs = await db
      .select({
        taskType: crawlerLogs.taskType,
        sourceType: crawlerLogs.sourceType,
        status: crawlerLogs.status,
        itemsFound: crawlerLogs.itemsFound,
        itemsSaved: crawlerLogs.itemsSaved,
        errors: crawlerLogs.errors,
        metadata: crawlerLogs.metadata,
        startTime: crawlerLogs.startTime,
        endTime: crawlerLogs.endTime,
        duration: crawlerLogs.duration,
        createdAt: crawlerLogs.createdAt,
      })
      .from(crawlerLogs)
      .where(sql`${crawlerLogs.status} = 'FAILED'`)
      .orderBy(sql`${crawlerLogs.createdAt} DESC`)
      .limit(10);

    console.log(`❌ 找到 ${failedLogs.length} 条失败记录:\n`);

    failedLogs.forEach((log, index) => {
      console.log(`--- 失败记录 #${index + 1} ---`);
      console.log(`任务类型: ${log.taskType}`);
      console.log(`数据来源: ${log.sourceType}`);
      console.log(`状态: ${log.status}`);
      console.log(`找到/保存: ${log.itemsFound}/${log.itemsSaved}`);
      console.log(`开始时间: ${log.startTime}`);
      console.log(`结束时间: ${log.endTime}`);
      console.log(`执行时长: ${log.duration}ms`);

      if (log.errors) {
        console.log(`错误详情:`);
        console.log(JSON.stringify(log.errors, null, 2));
      }

      if (log.metadata) {
        console.log(`元数据:`);
        console.log(JSON.stringify(log.metadata, null, 2));
      }

      console.log("");
    });

    // 统计今天各类任务的状态
    const today = new Date().toISOString().split("T")[0];
    console.log(`\n=== 今天 (${today}) 任务统计 ===\n`);

    const todayStats = await db.execute(sql`
      SELECT
        task_type,
        status,
        COUNT(*) as count
      FROM crawler_log
      WHERE DATE(created_at) = ${today}
      GROUP BY task_type, status
      ORDER BY task_type, status
    `);

    todayStats.rows.forEach((row: any) => {
      console.log(`${row.task_type} | ${row.status}: ${row.count}`);
    });

    console.log("\n=== 检查完成 ===");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ 查询失败:", error.message);
    process.exit(1);
  }
}

checkCrawlerLogs();
