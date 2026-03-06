/**
 * Good-Trending Crawler CLI
 * 爬虫命令行工具入口
 */
import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(__dirname, "../../../.env") });

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CrawlerManager, ProductData } from "./manager";
import { AmazonCrawler } from "./crawlers/amazon";
import { TwitterCrawler } from "./crawlers/twitter";
import { db, products } from "@good-trending/database";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

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

      // 插入新产品
      await db.insert(products).values({
        id: createId(),
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
    }

    if (result.errors.length > 0) {
      logger.error("Errors:");
      result.errors.forEach((err) => logger.error(`  - ${err}`));
    }
  }

  logger.info("\n=== Summary ===");
  logger.info(`Total products crawled: ${totalProducts}`);
  logger.info(`Total products saved: ${totalSaved}`);

  process.exit(0);
}

main().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});
