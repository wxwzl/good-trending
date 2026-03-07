/**
 * 检查今天新增商品和队列状态
 */
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), "../../.env.development") });

import { db, products, trends } from "@good-trending/database";
import { count, gte, and } from "drizzle-orm";
import Redis from "ioredis";

async function checkStatus() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`检查日期: ${today}\n`);

  // 1. 检查今天新增的商品
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const todayProducts = await db
    .select({ value: count() })
    .from(products)
    .where(gte(products.createdAt, todayDate));
  console.log("📦 今天新增商品数量:", Number(todayProducts[0]?.value || 0));

  // 2. 检查最新的商品
  const latestProducts = await db
    .select({
      id: products.id,
      name: products.name,
      createdAt: products.createdAt,
      sourceType: products.sourceType,
    })
    .from(products)
    .orderBy(products.createdAt)
    .limit(5);
  console.log("\n📋 最近5个商品:");
  latestProducts.forEach((p) => {
    const date = new Date(p.createdAt).toLocaleString("zh-CN");
    console.log(`   - [${p.sourceType}] ${p.name.substring(0, 50)}... (${date})`);
  });

  // 3. 检查今天的趋势记录
  const todayTrends = await db
    .select({ value: count() })
    .from(trends)
    .where(gte(trends.date, today));
  console.log("\n📈 今天趋势记录数:", Number(todayTrends[0]?.value || 0));

  // 4. 检查 BullMQ 队列状态
  const { Queue } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;

  const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380"),
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null,
  });

  console.log("\n📊 队列状态:");

  // 检查 trending-queue
  const trendingQueue = new Queue("trending-queue", { connection });
  const trendingCounts = await trendingQueue.getJobCounts("wait", "active", "completed", "failed", "delayed");
  console.log(`   Trending Queue:`);
  console.log(`     - waiting: ${trendingCounts.wait}`);
  console.log(`     - active: ${trendingCounts.active}`);
  console.log(`     - completed: ${trendingCounts.completed}`);
  console.log(`     - failed: ${trendingCounts.failed}`);
  console.log(`     - delayed: ${trendingCounts.delayed}`);

  // 检查 crawler-queue
  const crawlerQueue = new Queue("crawler-queue", { connection });
  const crawlerCounts = await crawlerQueue.getJobCounts("wait", "active", "completed", "failed", "delayed");
  console.log(`   Crawler Queue:`);
  console.log(`     - waiting: ${crawlerCounts.wait}`);
  console.log(`     - active: ${crawlerCounts.active}`);
  console.log(`     - completed: ${crawlerCounts.completed}`);
  console.log(`     - failed: ${crawlerCounts.failed}`);
  console.log(`     - delayed: ${crawlerCounts.delayed}`);

  // 5. 检查是否有未消费的趋势更新事件
  if (trendingCounts.wait > 0 || trendingCounts.delayed > 0) {
    console.log("\n⚠️  发现未消费的趋势更新事件!");

    // 获取等待中的任务
    if (trendingCounts.wait > 0) {
      const waitingJobs = await trendingQueue.getJobs("wait", 0, 2);
      console.log("   等待中的任务 (前3个):");
      waitingJobs.forEach((job, i) => {
        console.log(`     ${i + 1}. ${job.name || "unknown"} - ${JSON.stringify(job.data || {})}`);
      });
    }
  } else {
    console.log("\n✅ 队列正常，无未消费的趋势更新事件");
  }

  await trendingQueue.close();
  await crawlerQueue.close();
  await connection.quit();
  console.log("\n检查完成!");
}

checkStatus()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("检查失败:", err);
    process.exit(1);
  });
