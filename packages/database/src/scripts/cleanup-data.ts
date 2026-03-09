/**
 * 数据清理脚本
 * 自动清理过期的历史数据，保留必要的统计数据
 *
 * 清理策略：
 * - trend_ranks (TODAY/YESTERDAY): 保留 90 天
 * - trend_ranks (THIS_WEEK/LAST_7/15/30): 保留 1 年
 * - trend_ranks (THIS_MONTH): 永久保留
 * - product_social_stats: 保留 90 天
 * - category_heat_stats: 保留 90 天
 * - crawler_logs: 保留 30 天
 *
 * 使用方法:
 * pnpm db:cleanup
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { lt, and, eq, sql } from "drizzle-orm";
import {
  trendRanks,
  productSocialStats,
  categoryHeatStats,
  crawlerLogs,
} from "../schema";

interface CleanupResult {
  table: string;
  condition: string;
  deletedCount: number;
}

async function cleanupData() {
  console.log("🧹 开始数据清理...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);
  const results: CleanupResult[] = [];

  try {
    // ==================== 计算清理时间点 ====================
    const now = new Date();

    // 30 天前
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 90 天前
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    // 1 年前
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    console.log("📅 清理时间点:");
    console.log(`  30 天前: ${thirtyDaysAgo.toISOString().split("T")[0]}`);
    console.log(`  90 天前: ${ninetyDaysAgo.toISOString().split("T")[0]}`);
    console.log(`  1 年前: ${oneYearAgo.toISOString().split("T")[0]}\n`);

    // ==================== 1. 清理日榜数据 (保留 90 天) ====================
    console.log("🗑️  清理日榜数据 (TODAY/YESTERDAY, 保留 90 天)...");

    const dailyRankResult = await db
      .delete(trendRanks)
      .where(
        and(
          eq(trendRanks.periodType, "TODAY"),
          lt(trendRanks.statDate, ninetyDaysAgo)
        )
      );

    results.push({
      table: "trend_ranks (TODAY)",
      condition: "< 90 days",
      deletedCount: dailyRankResult.rowCount || 0,
    });

    const yesterdayRankResult = await db
      .delete(trendRanks)
      .where(
        and(
          eq(trendRanks.periodType, "YESTERDAY"),
          lt(trendRanks.statDate, ninetyDaysAgo)
        )
      );

    results.push({
      table: "trend_ranks (YESTERDAY)",
      condition: "< 90 days",
      deletedCount: yesterdayRankResult.rowCount || 0,
    });

    // ==================== 2. 清理中期榜单 (保留 1 年) ====================
    console.log("🗑️  清理中期榜单 (WEEK/7/15/30天, 保留 1 年)...");

    const midTermTypes = [
      "THIS_WEEK",
      "LAST_7_DAYS",
      "LAST_15_DAYS",
      "LAST_30_DAYS",
    ];

    for (const periodType of midTermTypes) {
      const result = await db
        .delete(trendRanks)
        .where(
          and(
            eq(trendRanks.periodType, periodType),
            lt(trendRanks.statDate, oneYearAgo)
          )
        );

      results.push({
        table: `trend_ranks (${periodType})`,
        condition: "< 1 year",
        deletedCount: result.rowCount || 0,
      });
    }

    // ==================== 3. 月榜永久保留，无需清理 ====================
    console.log("📦 月榜数据 (THIS_MONTH) 永久保留\n");

    // ==================== 4. 清理商品社交统计 (保留 90 天) ====================
    console.log("🗑️  清理商品社交统计 (保留 90 天)...");

    const socialStatsResult = await db
      .delete(productSocialStats)
      .where(lt(productSocialStats.statDate, ninetyDaysAgo));

    results.push({
      table: "product_social_stats",
      condition: "< 90 days",
      deletedCount: socialStatsResult.rowCount || 0,
    });

    // ==================== 5. 清理类目热度统计 (保留 90 天) ====================
    console.log("🗑️  清理类目热度统计 (保留 90 天)...");

    const heatStatsResult = await db
      .delete(categoryHeatStats)
      .where(lt(categoryHeatStats.statDate, ninetyDaysAgo));

    results.push({
      table: "category_heat_stats",
      condition: "< 90 days",
      deletedCount: heatStatsResult.rowCount || 0,
    });

    // ==================== 6. 清理爬虫日志 (保留 30 天) ====================
    console.log("🗑️  清理爬虫日志 (保留 30 天)...");

    const crawlerLogResult = await db
      .delete(crawlerLogs)
      .where(lt(crawlerLogs.createdAt, thirtyDaysAgo));

    results.push({
      table: "crawler_logs",
      condition: "< 30 days",
      deletedCount: crawlerLogResult.rowCount || 0,
    });

    // ==================== 统计结果 ====================
    console.log("\n" + "=".repeat(60));
    console.log("📊 清理结果汇总");
    console.log("=".repeat(60));

    const totalDeleted = results.reduce(
      (sum, r) => sum + r.deletedCount,
      0
    );

    for (const result of results) {
      if (result.deletedCount > 0) {
        console.log(
          `✓ ${result.table.padEnd(30)} ${result.deletedCount
            .toString()
            .padStart(6)} 条 (${result.condition})`
        );
      }
    }

    console.log("-".repeat(60));
    console.log(`总计清理: ${totalDeleted} 条记录`);
    console.log("=".repeat(60));

    // ==================== 数据库空间回收 ====================
    console.log("\n🔄 执行数据库空间回收...");
    await pool.query("VACUUM");
    console.log("✓ 空间回收完成");

    console.log("\n✅ 数据清理完成");
  } catch (error) {
    console.error("\n❌ 清理失败:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
cleanupData();
