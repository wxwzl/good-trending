/**
 * Good-Trending 爬虫 CLI
 * 重构后的爬虫命令行工具
 *
 * 使用方法:
 * pnpm crawl:category-heat     # 爬取类目热度
 * pnpm crawl:products          # 爬取商品
 * pnpm crawl:mentions          # 爬取商品社交提及
 * pnpm crawl:full              # 执行完整爬取流程（凌晨任务）
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createLogger, format, transports } from "winston";
import { db, categories, products } from "@good-trending/database";
import { sql } from "drizzle-orm";
import { GoogleSearchCrawler } from "./crawlers/GoogleSearchCrawler";
import {
  saveCategoryHeatStats,
  saveCrawledProducts,
  saveProductSocialStats,
  updateAllProductsBitmap,
  saveCrawlerLog,
} from "./services";
import type { CategoryData, CrawlerLogData } from "./types/crawler.types";

// 创建日志记录器
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
 * 验证数据库连接
 * 在爬虫开始前确保数据库可访问
 */
async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    logger.info("验证数据库连接...");

    // 尝试查询类目表，验证数据库连接
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(categories);

    if (result && result.length > 0) {
      logger.info(`✅ 数据库连接成功 (类目表有数据)`);
      return true;
    }

    logger.error("❌ 数据库连接失败：查询无结果");
    return false;
  } catch (error) {
    logger.error(`❌ 数据库连接失败: ${error}`);
    return false;
  }
}

/**
 * 获取所有类目
 */
async function getAllCategories(): Promise<CategoryData[]> {
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      searchKeywords: categories.searchKeywords,
    })
    .from(categories);

  return result.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    searchKeywords: c.searchKeywords || c.name,
  }));
}

/**
 * 执行类目热度爬取
 */
async function crawlCategoryHeat(headless: boolean): Promise<void> {
  logger.info("=== 开始类目热度爬取 ===");
  const startTime = new Date();

  const log: CrawlerLogData = {
    taskType: "CATEGORY_HEAT",
    sourceType: "REDDIT",
    status: "RUNNING",
    startTime,
    itemsFound: 0,
    itemsSaved: 0,
  };

  let crawler: GoogleSearchCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();
    logger.info(`加载了 ${categoryList.length} 个类目`);

    // 创建爬虫
    crawler = new GoogleSearchCrawler(
      { headless, timeout: 60000 },
      { categoryConfig: { maxResultsPerCategory: 10, searchDelayRange: [3000, 6000] } }
    );

    // 执行爬取
    const result = await crawler.crawlCategoryHeat(categoryList);

    // 保存结果
    const savedCount = await saveCategoryHeatStats(result.data);

    // 更新日志
    log.status = result.success ? "COMPLETED" : "FAILED";
    log.itemsFound = result.data.length;
    log.itemsSaved = savedCount;

    logger.info(`类目热度爬取完成: ${savedCount}/${result.data.length}`);
  } catch (error) {
    log.status = "FAILED";
    log.errors = [{ message: error instanceof Error ? error.message : String(error) }];
    logger.error("类目热度爬取失败:", error);
  } finally {
    // 确保浏览器关闭
    if (crawler) {
      await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
    }
    const endTime = new Date();
    log.endTime = endTime;
    log.duration = endTime.getTime() - startTime.getTime();
    await saveCrawlerLog(log);
  }
}

/**
 * 执行商品发现爬取
 */
async function crawlProducts(headless: boolean): Promise<void> {
  logger.info("=== 开始商品发现爬取 ===");
  const startTime = new Date();

  const log: CrawlerLogData = {
    taskType: "PRODUCT_DISCOVERY",
    sourceType: "REDDIT",
    status: "RUNNING",
    startTime,
    itemsFound: 0,
    itemsSaved: 0,
  };

  let crawler: GoogleSearchCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();
    logger.info(`加载了 ${categoryList.length} 个类目`);

    // 创建爬虫
    crawler = new GoogleSearchCrawler(
      { headless, timeout: 60000 },
      {
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 执行爬取
    const result = await crawler.crawlProductsByCategory(categoryList);

    // 保存结果
    const saveResult = await saveCrawledProducts(result.data, "REDDIT");

    // 更新日志
    log.status = result.success ? "COMPLETED" : "FAILED";
    log.itemsFound = result.data.length;
    log.itemsSaved = saveResult.savedCount;

    logger.info(`商品发现完成: 新商品 ${saveResult.savedCount}, 跳过 ${saveResult.skippedCount}`);
  } catch (error) {
    log.status = "FAILED";
    log.errors = [{ message: error instanceof Error ? error.message : String(error) }];
    logger.error("商品发现爬取失败:", error);
  } finally {
    // 确保浏览器关闭
    if (crawler) {
      await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
    }
    const endTime = new Date();
    log.endTime = endTime;
    log.duration = endTime.getTime() - startTime.getTime();
    await saveCrawlerLog(log);
  }
}

/**
 * 执行商品社交提及爬取
 */
async function crawlProductMentions(headless: boolean): Promise<void> {
  logger.info("=== 开始商品社交提及爬取 ===");
  const startTime = new Date();

  const log: CrawlerLogData = {
    taskType: "PRODUCT_MENTION",
    sourceType: "REDDIT",
    status: "RUNNING",
    startTime,
    itemsFound: 0,
    itemsSaved: 0,
  };

  let crawler: GoogleSearchCrawler | null = null;

  try {
    // 获取所有商品
    const productList = await db.select({ id: products.id, name: products.name }).from(products);

    logger.info(`加载了 ${productList.length} 个商品`);

    // 创建爬虫
    crawler = new GoogleSearchCrawler(
      { headless, timeout: 60000 },
      { categoryConfig: { searchDelayRange: [3000, 5000] } }
    );

    let processedCount = 0;
    const date = new Date();

    for (const product of productList) {
      try {
        logger.info(`处理商品 [${processedCount + 1}/${productList.length}]: ${product.name}`);

        // 爬取提及数
        const mentions = await crawler.crawlProductMentions(product.name, date);

        // 保存统计
        await saveProductSocialStats(product.id, date, mentions.periodResults);

        processedCount++;

        // 每处理10个商品延迟一下
        if (processedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        logger.error(`处理商品 ${product.name} 失败:`, error);
      }
    }

    // 更新日志
    log.status = "COMPLETED";
    log.itemsFound = productList.length;
    log.itemsSaved = processedCount;

    logger.info(`商品社交提及爬取完成: ${processedCount}/${productList.length}`);
  } catch (error) {
    log.status = "FAILED";
    log.errors = [{ message: error instanceof Error ? error.message : String(error) }];
    logger.error("商品社交提及爬取失败:", error);
  } finally {
    // 确保浏览器关闭
    if (crawler) {
      await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
    }
    const endTime = new Date();
    log.endTime = endTime;
    log.duration = endTime.getTime() - startTime.getTime();
    await saveCrawlerLog(log);
  }
}

/**
 * 执行完整爬取流程（凌晨任务）
 */
async function crawlFull(headless: boolean): Promise<void> {
  logger.info("=== 开始完整爬取流程 ===");
  const startTime = new Date();

  try {
    // 步骤1: 爬取类目热度
    await crawlCategoryHeat(headless);

    // 步骤2: 爬取商品
    await crawlProducts(headless);

    // 步骤3: 更新 Bitmap
    logger.info("更新 Bitmap 统计...");
    const bitmapUpdated = await updateAllProductsBitmap();
    logger.info(`Bitmap 更新完成: ${bitmapUpdated} 个商品`);

    // 步骤4: 爬取商品社交提及
    await crawlProductMentions(headless);

    // 注意: 趋势榜单由 scheduler 定时任务生成，不在爬虫流程中处理
    // scheduler 每小时自动根据 productSocialStats 表数据更新 trendRanks 表

    const endTime = new Date();
    logger.info(
      `=== 完整爬取流程完成，耗时 ${(endTime.getTime() - startTime.getTime()) / 1000}s ===`
    );
  } catch (error) {
    logger.error("完整爬取流程失败:", error);
    process.exit(1);
  }
}

/**
 * 执行昨天数据统计爬取
 */
async function crawlYesterdayData(headless: boolean): Promise<void> {
  logger.info("=== 开始昨天数据统计爬取 ===");
  const startTime = new Date();

  const log: CrawlerLogData = {
    taskType: "YESTERDAY_STATS",
    sourceType: "REDDIT",
    status: "RUNNING",
    startTime,
    itemsFound: 0,
    itemsSaved: 0,
  };

  let crawler: GoogleSearchCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();
    logger.info(`加载了 ${categoryList.length} 个类目`);

    // 创建爬虫
    crawler = new GoogleSearchCrawler(
      { headless, timeout: 60000 },
      {
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 步骤1: 爬取昨天类目热度
    logger.info("步骤1: 爬取昨天类目热度...");
    const heatResult = await crawler.crawlYesterdayCategoryHeat(categoryList);
    const heatSaved = await saveCategoryHeatStats(heatResult.data);
    logger.info(`类目热度保存完成: ${heatSaved} 条`);

    // 步骤2: 爬取昨天商品
    logger.info("步骤2: 爬取昨天商品...");
    const productResult = await crawler.crawlYesterdayProducts(categoryList);
    const saveResult = await saveCrawledProducts(productResult.data, "REDDIT");
    logger.info(`商品保存完成: 新商品 ${saveResult.savedCount}, 跳过 ${saveResult.skippedCount}`);

    // 更新日志
    log.status = "COMPLETED";
    log.itemsFound = productResult.data.length;
    log.itemsSaved = saveResult.savedCount;

    const endTime = new Date();
    logger.info(
      `=== 昨天数据统计爬取完成，耗时 ${(endTime.getTime() - startTime.getTime()) / 1000}s ===`
    );
  } catch (error) {
    log.status = "FAILED";
    log.errors = [{ message: error instanceof Error ? error.message : String(error) }];
    logger.error("昨天数据统计爬取失败:", error);
    throw error;
  } finally {
    // 确保浏览器关闭
    if (crawler) {
      await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
    }
    const endTime = new Date();
    log.endTime = endTime;
    log.duration = endTime.getTime() - startTime.getTime();
    await saveCrawlerLog(log);
  }
}

/**
 * CLI 主函数
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("command", {
      alias: "c",
      type: "string",
      description: "爬取命令",
      choices: ["category-heat", "products", "mentions", "yesterday", "full"],
      default: "full",
    })
    .option("headless", {
      alias: "h",
      type: "boolean",
      description: "无头模式",
      default: true,
    })
    .option("limit", {
      alias: "l",
      type: "number",
      description: "限制处理的类目/商品数量（用于测试）",
      default: 0, // 0 表示不限制
    })
    .parse();

  logger.info("=== Good-Trending Crawler CLI ===");
  logger.info(`命令: ${argv.command}`);
  logger.info(`无头模式: ${argv.headless}`);

  // 验证数据库连接
  const dbConnected = await verifyDatabaseConnection();
  if (!dbConnected) {
    logger.error("数据库连接失败，爬虫无法继续");
    process.exit(1);
  }

  try {
    switch (argv.command) {
      case "category-heat":
        await crawlCategoryHeat(argv.headless);
        break;
      case "products":
        await crawlProducts(argv.headless);
        break;
      case "mentions":
        await crawlProductMentions(argv.headless);
        break;
      case "yesterday":
        await crawlYesterdayData(argv.headless);
        break;
      case "full":
      default:
        await crawlFull(argv.headless);
        break;
    }

    logger.info("=== 爬取任务完成 ===");
    process.exit(0);
  } catch (error) {
    logger.error("爬取任务失败:", error);
    process.exit(1);
  }
}

main();
