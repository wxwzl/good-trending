#!/usr/bin/env node
/**
 * 查看 BullMQ 队列状态
 * 用法: node scripts/check-queues.mjs
 */
import { Queue } from "bullmq";
import Redis from "ioredis";

// 加载环境变量
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
    };
  }
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  };
}

async function checkQueues() {
  const redis = new Redis(getRedisConfig());

  const crawlerQueue = new Queue("crawler-queue", { connection: redis });
  const trendingQueue = new Queue("trending-queue", { connection: redis });

  console.log("\n📊 BullMQ 队列状态\n");
  console.log("═══════════════════════════════════════\n");

  // Crawler 队列
  const crawlerJobs = await crawlerQueue.getJobCounts();
  console.log("🕷️  Crawler 队列:");
  console.log(`   等待中: ${crawlerJobs.waiting}`);
  console.log(`   活跃中: ${crawlerJobs.active}`);
  console.log(`   已完成: ${crawlerJobs.completed}`);
  console.log(`   失败: ${crawlerJobs.failed}`);
  console.log(`   延迟: ${crawlerJobs.delayed}`);
  console.log();

  // Trending 队列
  const trendingJobs = await trendingQueue.getJobCounts();
  console.log("📈 Trending 队列:");
  console.log(`   等待中: ${trendingJobs.waiting}`);
  console.log(`   活跃中: ${trendingJobs.active}`);
  console.log(`   已完成: ${trendingJobs.completed}`);
  console.log(`   失败: ${trendingJobs.failed}`);
  console.log(`   延迟: ${trendingJobs.delayed}`);
  console.log();

  // 查看等待中的任务详情
  const waitingJobs = await trendingQueue.getWaiting(0, 10);
  if (waitingJobs.length > 0) {
    console.log("⏳ 等待中的 Trending 任务:");
    for (const job of waitingJobs) {
      console.log(`   - Job ${job.id}: ${job.data.type} (triggeredBy: ${job.data.triggeredBy})`);
    }
    console.log();
  }

  // 查看最近完成的任务
  const completedJobs = await trendingQueue.getCompleted(0, 5);
  if (completedJobs.length > 0) {
    console.log("✅ 最近完成的 Trending 任务:");
    for (const job of completedJobs) {
      console.log(`   - Job ${job.id}: ${job.data.type} at ${job.finishedOn}`);
    }
    console.log();
  }

  console.log("═══════════════════════════════════════");

  await crawlerQueue.close();
  await trendingQueue.close();
  await redis.quit();
}

checkQueues().catch(console.error);
