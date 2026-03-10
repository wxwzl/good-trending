/**
 * AI 商品发现任务工作线程测试
 * 启动 Worker 处理队列中的任务
 */

// 必须在任何其他导入之前加载环境变量
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.development") });

// 强制设置 AI 环境变量（确保在模块加载前生效）
process.env.ENABLE_AI_ANALYSIS = "true";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "kimi";
process.env.AI_API_KEY = process.env.AI_API_KEY || "";
process.env.AI_MODEL = process.env.AI_MODEL || "kimi-k2.5";

// 验证环境变量
console.log("Environment check:");
console.log("  ENABLE_AI_ANALYSIS:", process.env.ENABLE_AI_ANALYSIS);
console.log("  AI_PROVIDER:", process.env.AI_PROVIDER);
console.log("  AI_API_KEY:", process.env.AI_API_KEY ? "已设置 (" + process.env.AI_API_KEY.substring(0, 10) + "...)" : "未设置");

import { createLoggerInstance } from "@good-trending/shared";
import { getRedisConnection } from "../apps/scheduler/src/queue/redis.js";
import { getCrawlerQueue, closeQueues } from "../apps/scheduler/src/queue/index.js";
import { createCrawlerProcessor, closeCrawlerProcessor } from "../apps/scheduler/src/processors/index.js";
import { triggerJob } from "../apps/scheduler/src/scheduler/index.js";

const logger = createLoggerInstance("test-ai-worker");

async function main() {
  logger.info("=== AI 商品发现 Worker 测试 ===");

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

    // 3. 获取队列当前状态
    const initialCounts = await crawlerQueue.getJobCounts("waiting", "active", "completed", "failed");
    logger.info("📊 初始队列状态:", initialCounts);

    // 4. 创建 Worker
    logger.info("4. 创建 Worker...");
    const worker = createCrawlerProcessor(1);
    logger.info("✅ Worker 创建成功");

    // 5. 添加任务到队列
    logger.info("5. 添加 AI 商品发现任务...");
    await triggerJob("ai-product-discovery");
    logger.info("✅ 任务已添加到队列");

    // 6. 监听 Worker 事件
    worker.on("completed", (job, result) => {
      logger.info(`✅ 任务 ${job.id} 完成:`, result);
    });

    worker.on("failed", (job, error) => {
      logger.error(`❌ 任务 ${job?.id} 失败:`, error.message);
    });

    // 7. 等待任务完成
    logger.info("6. 等待任务执行 (60秒)...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // 8. 获取最终队列状态
    const finalCounts = await crawlerQueue.getJobCounts("waiting", "active", "completed", "failed");
    logger.info("📊 最终队列状态:", finalCounts);

    // 9. 获取最近的任务
    const jobs = await crawlerQueue.getJobs(["completed", "failed"], 0, 5, true);
    logger.info(`📋 最近 ${jobs.length} 个任务:`);

    for (const job of jobs) {
      logger.info(`  - 任务 ${job.id}: ${job.name}`);
      if (job.returnvalue) {
        logger.info(`    结果:`, JSON.stringify(job.returnvalue, null, 2));
      }
      if (job.failedReason) {
        logger.error(`    错误: ${job.failedReason}`);
      }
    }

    // 10. 清理
    logger.info("7. 清理资源...");
    await closeCrawlerProcessor();
    await closeQueues();
    logger.info("✅ 资源已清理");

    logger.info("=== 测试完成 ===");
    process.exit(0);
  } catch (error) {
    logger.error("测试失败:", error);
    process.exit(1);
  }
}

main();
