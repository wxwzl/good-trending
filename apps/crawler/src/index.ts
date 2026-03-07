/**
 * Good-Trending Crawler CLI
 * 爬虫命令行工具入口
 */
import { config } from "dotenv";
import { resolve } from "path";

// 根据环境加载对应的 .env 文件
// 优先级：.env.{NODE_ENV} > .env
const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../", envFile) });
console.log(`Loaded environment variables from ${envFile}`);
console.log(`process.env.POSTGRES_USER: ${process.env.POSTGRES_USER}`);

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CrawlerManager, ProductData } from "./manager";
import { AmazonCrawler } from "./crawlers/amazon";
import { TwitterCrawler } from "./crawlers/twitter";
import {
  createProductsBatch,
  type CreateProductInput,
  type SourceType,
} from "@good-trending/database";
import { Queue } from "bullmq";

/**
 * 从环境变量解析 Redis 配置
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname || "localhost",
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1), 10) : 0,
      maxRetriesPerRequest: null as null,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6380", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    maxRetriesPerRequest: null as null,
  };
}

// 趋势任务队列（用于爬虫完成后立即触发趋势更新）
let trendingQueue: Queue | null = null;

function getTrendingQueue(): Queue {
  if (!trendingQueue) {
    const config = getRedisConfig();
    trendingQueue = new Queue("trending-queue", {
      connection: {
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
      },
    });
  }
  return trendingQueue;
}

/**
 * 触发趋势更新任务
 */
async function triggerTrendingUpdate(source: string, productCount: number): Promise<void> {
  try {
    const queue = getTrendingQueue();
    await queue.add(
      "update-trending",
      {
        type: "update",
        triggeredBy: `crawler-${source}`,
        traceId: `crawl-${Date.now()}`,
        metadata: {
          source,
          newProducts: productCount,
        },
      },
      {
        jobId: `trending-update-${Date.now()}`,
        priority: 1, // 高优先级
      }
    );
    logger.info(`Triggered trending update after ${source} crawl`);
  } catch (error) {
    logger.error(`Failed to trigger trending update: ${error}`);
  }
}

import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * 将爬取的产品数据保存到数据库
 * 使用共享的数据库模块
 */
async function saveProductsToDatabase(productDataList: ProductData[]): Promise<number> {
  // 转换为统一的输入格式
  const inputs: CreateProductInput[] = productDataList.map((productData) => ({
    name: productData.name,
    description: productData.description,
    image: productData.image,
    price: productData.price,
    currency: productData.currency,
    sourceUrl: productData.sourceUrl,
    sourceId: productData.sourceId,
    sourceType: productData.sourceType as SourceType,
    topics: productData.topics,
  }));

  // 使用共享的批量创建函数
  const result = await createProductsBatch(inputs);

  // 记录结果
  if (result.savedCount > 0) {
    logger.info(`Saved ${result.savedCount} products to database`);
  }
  if (result.skippedCount > 0) {
    logger.info(`Skipped ${result.skippedCount} existing products`);
  }
  if (result.failedCount > 0) {
    logger.error(`Failed to save ${result.failedCount} products`, result.errors);
  }

  return result.savedCount;
}

/**
 * 主函数
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("source", {
      alias: "s",
      type: "string",
      description: "Crawler source to run",
      choices: ["amazon", "twitter", "all"],
      default: "all",
    })
    .option("max-products", {
      alias: "m",
      type: "number",
      description: "Maximum number of products to crawl per source",
      default: 20,
    })
    .option("headless", {
      alias: "h",
      type: "boolean",
      description: "Run browser in headless mode",
      default: true,
    })
    .option("save-to-db", {
      alias: "d",
      type: "boolean",
      description: "Save crawled data to database",
      default: true,
    })
    .parse();

  logger.info("=== Good-Trending Crawler ===");
  logger.info(`Source: ${argv.source}`);
  logger.info(`Max products per source: ${argv.maxProducts}`);
  logger.info(`Headless mode: ${argv.headless}`);
  logger.info(`Save to database: ${argv.saveToDb}`);

  const manager = new CrawlerManager({ logLevel: "info" });

  // 注册爬虫
  if (argv.source === "amazon" || argv.source === "all") {
    const amazonCrawler = new AmazonCrawler(
      { headless: argv.headless },
      { maxProducts: argv.maxProducts }
    );
    manager.register("amazon", amazonCrawler);
  }

  if (argv.source === "twitter" || argv.source === "all") {
    const twitterCrawler = new TwitterCrawler(
      { headless: argv.headless },
      { maxTweets: argv.maxProducts }
    );
    manager.register("twitter", twitterCrawler);
  }

  logger.info(`Registered crawlers: ${manager.getRegisteredCrawlers().join(", ")}`);

  // 运行爬虫
  const results = await manager.runAll();

  // 处理结果
  let totalProducts = 0;
  let totalSaved = 0;

  for (const [name, result] of results) {
    logger.info(`\n=== ${name} Results ===`);
    logger.info(`Total products: ${result.total}`);
    logger.info(`Errors: ${result.errors.length}`);
    logger.info(`Duration: ${result.duration}ms`);

    totalProducts += result.total;

    if (argv.saveToDb && result.data.length > 0) {
      logger.info(`Saving ${result.data.length} products to database...`);
      const saved = await saveProductsToDatabase(result.data);
      totalSaved += saved;
      logger.info(`Saved ${saved} products to database`);

      // 爬虫完成后立即触发趋势更新
      if (saved > 0) {
        await triggerTrendingUpdate(name, saved);
      }
    }

    if (result.errors.length > 0) {
      logger.error("Errors:");
      result.errors.forEach((err) => logger.error(`  - ${err}`));
    }
  }

  logger.info("\n=== Summary ===");
  logger.info(`Total products crawled: ${totalProducts}`);
  logger.info(`Total products saved: ${totalSaved}`);

  // 关闭队列连接
  if (trendingQueue) {
    await trendingQueue.close();
    logger.info("Queue connection closed");
  }

  process.exit(0);
}

main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
