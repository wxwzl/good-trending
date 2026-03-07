/**
 * 检查失败的队列任务
 */
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.development") });

import { Queue } from "bullmq";
import IORedis from "ioredis";

async function checkFailedJobs() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380"),
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null,
  });

  console.log("=== 检查失败的任务 ===\n");

  // 1. 检查爬虫失败任务
  const crawlerQueue = new Queue("crawler-queue", { connection });
  const crawlerFailedJobs = await crawlerQueue.getJobs("failed", 0, 4);

  console.log("📊 Crawler Queue 失败任务 (前5个):");
  for (let i = 0; i < crawlerFailedJobs.length; i++) {
    const job = crawlerFailedJobs[i];
    console.log(`  ${i + 1}. Job ID: ${job.id}`);
    console.log(`     Source: ${job.data?.source || "unknown"}`);
    console.log(`     Failed Reason: ${job.failedReason || "unknown"}`);
    console.log(`     Attempts: ${job.attemptsMade}/${job.opts?.attempts || 1}`);
    if (job.stacktrace && job.stacktrace.length > 0) {
      console.log(`     Stack: ${job.stacktrace[0].substring(0, 200)}...`);
    }
    console.log();
  }

  // 2. 检查趋势失败任务
  const trendingQueue = new Queue("trending-queue", { connection });
  const trendingFailedJobs = await trendingQueue.getJobs("failed", 0, 4);

  console.log("📊 Trending Queue 失败任务 (前5个):");
  for (let i = 0; i < trendingFailedJobs.length; i++) {
    const job = trendingFailedJobs[i];
    console.log(`  ${i + 1}. Job ID: ${job.id}`);
    console.log(`     Type: ${job.data?.type || "unknown"}`);
    console.log(`     Failed Reason: ${job.failedReason || "unknown"}`);
    console.log(`     Attempts: ${job.attemptsMade}/${job.opts?.attempts || 1}`);
    if (job.stacktrace && job.stacktrace.length > 0) {
      console.log(`     Stack: ${job.stacktrace[0].substring(0, 200)}...`);
    }
    console.log();
  }

  await crawlerQueue.close();
  await trendingQueue.close();
  await connection.quit();

  console.log("检查完成!");
}

checkFailedJobs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("检查失败:", err);
    process.exit(1);
  });
