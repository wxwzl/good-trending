/**
 * AI 商品发现任务测试脚本
 * 手动触发 AI 商品发现任务进行测试
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 加载环境变量
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.development") });

import { createLoggerInstance } from "@good-trending/shared";
import { getRedisConnection } from "../apps/scheduler/src/queue/redis.js";
import { getCrawlerQueue } from "../apps/scheduler/src/queue/index.js";
import { triggerJob } from "../apps/scheduler/src/scheduler/index.js";

const logger = createLoggerInstance("test-ai-discovery");

async function main() {
  logger.info("=== AI 商品发现任务测试 ===");

  try {
    // 1. 测试 Redis 连接
    logger.info("1. 测试 Redis 连接...");
    const redis = getRedisConnection();
    await redis.ping();
    logger.info("✅ Redis 连接成功");

    // 2. 初始化队列
    logger.info("2. 初始化队列...");
    const crawlerQueue = getCrawlerQueue();
    logger.info("✅ 队列初始化成功");

    // 3. 手动触发 AI 商品发现任务
    logger.info("3. 触发 AI 商品发现任务...");
    await triggerJob("ai-product-discovery");
    logger.info("✅ 任务已添加到队列");

    // 4. 等待一段时间查看任务状态
    logger.info("4. 等待任务执行...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. 获取队列状态
    const jobCounts = await crawlerQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed"
    );
    logger.info("📊 队列状态:", jobCounts);

    // 6. 获取最近的任务
    const jobs = await crawlerQueue.getJobs(["completed", "failed"], 0, 5, true);
    logger.info(`📋 最近 ${jobs.length} 个任务:`);

    for (const job of jobs) {
      logger.info(`  - 任务 ${job.id}: ${job.name} - ${job.returnvalue ? "成功" : "失败"}`);
      if (job.returnvalue) {
        logger.info(`    结果:`, job.returnvalue);
      }
      if (job.failedReason) {
        logger.error(`    错误: ${job.failedReason}`);
      }
    }

    logger.info("=== 测试完成 ===");
    process.exit(0);
  } catch (error) {
    logger.error("测试失败:", error);
    process.exit(1);
  }
}

main();
