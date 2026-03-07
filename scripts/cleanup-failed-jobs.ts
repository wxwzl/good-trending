/**
 * 清理失败的队列任务
 */
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.development") });

import { Queue } from "bullmq";
import IORedis from "ioredis";

async function cleanupFailedJobs() {
  const connection = new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380"),
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: null,
  });

  console.log("=== 清理失败的队列任务 ===\n");

  // 1. 清理爬虫失败任务
  const crawlerQueue = new Queue("crawler-queue", { connection });
  const crawlerFailedJobs = await crawlerQueue.getJobs("failed");
  console.log(`📊 Crawler Queue: 发现 ${crawlerFailedJobs.length} 个失败任务`);

  for (const job of crawlerFailedJobs) {
    await job.remove();
  }
  console.log(`✅ 已清理 ${crawlerFailedJobs.length} 个爬虫失败任务\n`);

  // 2. 清理趋势失败任务
  const trendingQueue = new Queue("trending-queue", { connection });
  const trendingFailedJobs = await trendingQueue.getJobs("failed");
  console.log(`📊 Trending Queue: 发现 ${trendingFailedJobs.length} 个失败任务`);

  for (const job of trendingFailedJobs) {
    await job.remove();
  }
  console.log(`✅ 已清理 ${trendingFailedJobs.length} 个趋势失败任务\n`);

  await crawlerQueue.close();
  await trendingQueue.close();
  await connection.quit();

  console.log("🎉 清理完成!");
}

cleanupFailedJobs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("清理失败:", err);
    process.exit(1);
  });
