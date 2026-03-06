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

config({ path: resolve(__dirname, "../../../", envFile) });
config({ path: resolve(__dirname, "../../../.env") });

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CrawlerManager, ProductData } from "./manager";
import { AmazonCrawler } from "./crawlers/amazon";
import { TwitterCrawler } from "./crawlers/twitter";
import { db, products, topics, productTopics } from "@good-trending/database";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
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

// 生成 slug 的辅助函数
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
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
 * 确保分类存在，返回分类ID映射
 */
async function ensureTopics(topicSlugs: string[]): Promise<Map<string, string>> {
  const topicMap = new Map<string, string>();

  for (const slug of topicSlugs) {
    // 检查分类是否已存在
    const existing = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      topicMap.set(slug, existing[0].id);
    } else {
      // 创建新分类
      const topicId = createId();
      const name = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      try {
        await db.insert(topics).values({
          id: topicId,
          name,
          slug,
          description: `Auto-created topic for ${slug}`,
        });
        topicMap.set(slug, topicId);
        logger.info(`Created new topic: ${slug}`);
      } catch (error) {
        logger.warn(`Failed to create topic ${slug}: ${error}`);
      }
    }
  }

  return topicMap;
}

/**
 * 将爬取的产品数据保存到数据库
 */
async function saveProductsToDatabase(productDataList: ProductData[]): Promise<number> {
  let savedCount = 0;

  for (const productData of productDataList) {
    try {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(products)
        .where(eq(products.sourceId, productData.sourceId))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`Product already exists: ${productData.sourceId}`);
        continue;
      }

      const productId = createId();

      // 插入新产品
      await db.insert(products).values({
        id: productId,
        name: productData.name,
        slug: generateSlug(productData.name),
        description: productData.description,
        image: productData.image,
        price: productData.price ? productData.price.toString() : null,
        currency: productData.currency ?? "USD",
        sourceUrl: productData.sourceUrl,
        sourceId: productData.sourceId,
        sourceType: productData.sourceType as "X_PLATFORM" | "AMAZON",
      });

      // 处理分类关联
      if (productData.topics && productData.topics.length > 0) {
        const topicMap = await ensureTopics(productData.topics);

        // 创建商品-分类关联
        for (const [slug, topicId] of topicMap) {
          try {
            await db.insert(productTopics).values({
              productId,
              topicId,
            });
            logger.debug(`Linked product ${productData.name} to topic ${slug}`);
          } catch (error) {
            logger.warn(`Failed to link product to topic ${slug}: ${error}`);
          }
        }
      }

      savedCount++;
      logger.info(`Saved product: ${productData.name}`);
    } catch (error) {
      logger.error(`Failed to save product ${productData.name}: ${error}`);
    }
  }

  return savedCount;
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
