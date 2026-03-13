import dotenv from "dotenv";
import path from "path";

// 加载环境变量（从项目根目录的 .env.development）
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.development") });

import { db } from "@good-trending/database";
import { products, trendRanks, categories, crawlerLogs } from "@good-trending/database";
import { count, sql } from "drizzle-orm";

async function checkStats() {
  try {
    console.log("=== Good-Trending 数据库统计 ===\n");

    // 检查商品数量
    const productResult = await db.select({ count: count() }).from(products);
    console.log("📦 商品数量:", productResult[0]?.count || 0);

    // 检查类目数量
    const categoryResult = await db.select({ count: count() }).from(categories);
    console.log("📁 类目数量:", categoryResult[0]?.count || 0);

    // 检查趋势榜单数据数量
    const trendResult = await db.select({ count: count() }).from(trendRanks);
    console.log("📈 趋势榜单数据数量:", trendResult[0]?.count || 0);

    // 检查今天的趋势数据
    const today = new Date().toISOString().split("T")[0];
    const todayTrendResult = await db
      .select({ count: count() })
      .from(trendRanks)
      .where(sql`${trendRanks.statDate} = ${today}`);
    console.log(`📅 今天(${today})的趋势数据数量:`, todayTrendResult[0]?.count || 0);

    // 显示最近5天的趋势数据分布
    const recentTrends = await db
      .select({
        date: trendRanks.statDate,
        count: sql`COUNT(*)`.as("count"),
      })
      .from(trendRanks)
      .groupBy(trendRanks.statDate)
      .orderBy(sql`${trendRanks.statDate} DESC`)
      .limit(5);
    console.log("\n📊 最近5天的趋势数据分布:");
    if (recentTrends.length === 0) {
      console.log("  (暂无数据)");
    } else {
      recentTrends.forEach((t) => {
        console.log(`  ${t.date}: ${t.count} 条记录`);
      });
    }

    // 显示最近的爬虫日志
    const recentLogs = await db
      .select({
        taskType: crawlerLogs.taskType,
        sourceType: crawlerLogs.sourceType,
        status: crawlerLogs.status,
        itemsFound: crawlerLogs.itemsFound,
        itemsSaved: crawlerLogs.itemsSaved,
        createdAt: crawlerLogs.createdAt,
      })
      .from(crawlerLogs)
      .orderBy(sql`${crawlerLogs.createdAt} DESC`)
      .limit(5);
    console.log("\n🕷️ 最近5条爬虫日志:");
    if (recentLogs.length === 0) {
      console.log("  (暂无数据)");
    } else {
      recentLogs.forEach((log) => {
        const date = new Date(log.createdAt).toLocaleString("zh-CN");
        console.log(
          `  [${date}] ${log.taskType} | ${log.sourceType} | ${log.status} | 找到:${log.itemsFound} 保存:${log.itemsSaved}`
        );
      });
    }

    // 显示最近的商品（按首次发现时间）
    const recentProducts = await db
      .select({
        name: products.name,
        firstSeenAt: products.firstSeenAt,
        discoveredFrom: products.discoveredFrom,
      })
      .from(products)
      .orderBy(sql`${products.firstSeenAt} DESC`)
      .limit(5);
    console.log("\n🆕 最近5条发现的商品:");
    if (recentProducts.length === 0) {
      console.log("  (暂无数据)");
    } else {
      recentProducts.forEach((p) => {
        const name = p.name.length > 50 ? p.name.substring(0, 50) + "..." : p.name;
        console.log(`  [${p.firstSeenAt}] ${name} (${p.discoveredFrom})`);
      });
    }

    // 按数据来源统计商品数量
    const sourceStats = await db
      .select({
        source: products.discoveredFrom,
        count: sql`COUNT(*)`.as("count"),
      })
      .from(products)
      .groupBy(products.discoveredFrom);
    console.log("\n📊 按数据来源统计商品数量:");
    if (sourceStats.length === 0) {
      console.log("  (暂无数据)");
    } else {
      sourceStats.forEach((s) => {
        console.log(`  ${s.source}: ${s.count} 个商品`);
      });
    }

    console.log("\n=== 统计完成 ===");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ 查询失败:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.error("   请检查 PostgreSQL 数据库是否已启动 (端口: 5436)");
    } else if (error.message.includes("does not exist")) {
      console.error("   数据库表不存在，请运行迁移命令: pnpm db:migrate");
    }
    process.exit(1);
  }
}

checkStats();
