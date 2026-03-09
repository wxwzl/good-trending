#!/usr/bin/env node
/**
 * 爬取近30天数据脚本（JavaScript 版本）
 * 用于开发环境初始化数据
 *
 * 使用方法:
 * node scripts/crawl-30days.js           # 无头模式（默认）
 * node scripts/crawl-30days.js --debug   # 有界面模式（用于调试）
 */

const path = require("path");

// ========== 加载环境变量 ==========
const { loadEnv, validateDatabaseConfig, printEnvInfo } = require("./load-env");

const command = process.argv.includes("--debug") ? "dev" : "start";
const envInfo = loadEnv({ command });
printEnvInfo(envInfo);

// 验证数据库配置
if (!validateDatabaseConfig()) {
  process.exit(1);
}
console.log("✅ 环境变量加载完成\n");
// =================================

// 动态导入 ES 模块
async function main() {
  const { createLogger, format, transports } = await import("winston");
  const { db, categories, products } = await import("@good-trending/database");
  const { sql } = await import("drizzle-orm");
  const { GoogleSearchCrawler } = await import("../src/crawlers/GoogleSearchCrawler.js");
  const {
    saveCategoryHeatStats,
    saveCrawledProducts,
    saveProductSocialStats,
    updateAllProductsBitmap,
    generateTrendRanks,
    saveCrawlerLog,
  } = await import("../src/services/crawler-data-processor.js");

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
   * 获取所有类目
   */
  async function getAllCategories() {
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
   * 步骤1: 爬取类目热度（近30天）
   */
  async function step1_CategoryHeat(headless) {
    logger.info("\n📊 步骤1: 爬取类目热度统计...");
    const startTime = new Date();

    const log = {
      taskType: "CATEGORY_HEAT",
      sourceType: "REDDIT",
      status: "RUNNING",
      startTime,
      itemsFound: 0,
      itemsSaved: 0,
    };

    let crawler = null;

    try {
      const categoryList = await getAllCategories();
      logger.info(`   加载了 ${categoryList.length} 个类目`);

      crawler = new GoogleSearchCrawler(
        { headless, timeout: 60000 },
        { categoryConfig: { maxResultsPerCategory: 10, searchDelayRange: [3000, 6000] } }
      );

      // 爬取类目热度
      const result = await crawler.crawlCategoryHeat(categoryList);
      const savedCount = await saveCategoryHeatStats(result.data);

      log.status = result.success ? "COMPLETED" : "FAILED";
      log.itemsFound = result.data.length;
      log.itemsSaved = savedCount;

      logger.info(`   ✅ 类目热度保存完成: ${savedCount} 条`);
    } catch (error) {
      log.status = "FAILED";
      log.errors = [{ message: error.message || String(error) }];
      logger.error("   ❌ 类目热度爬取失败:", error);
      throw error;
    } finally {
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
   * 步骤2: 爬取商品（近30天）
   */
  async function step2_CrawlProducts(headless) {
    logger.info("\n🛍️ 步骤2: 爬取近30天商品数据...");
    const startTime = new Date();

    const log = {
      taskType: "PRODUCT_DISCOVERY",
      sourceType: "REDDIT",
      status: "RUNNING",
      startTime,
      itemsFound: 0,
      itemsSaved: 0,
    };

    let crawler = null;
    let totalSaved = 0;

    try {
      const categoryList = await getAllCategories();
      logger.info(`   加载了 ${categoryList.length} 个类目`);

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

      // 爬取商品
      const result = await crawler.crawlProductsByCategory(categoryList);
      const saveResult = await saveCrawledProducts(result.data, "REDDIT");

      log.status = result.success ? "COMPLETED" : "FAILED";
      log.itemsFound = result.data.length;
      log.itemsSaved = saveResult.savedCount;
      totalSaved = saveResult.savedCount;

      logger.info(
        `   ✅ 商品爬取完成: 新商品 ${saveResult.savedCount}, 跳过 ${saveResult.skippedCount}`
      );
    } catch (error) {
      log.status = "FAILED";
      log.errors = [{ message: error.message || String(error) }];
      logger.error("   ❌ 商品爬取失败:", error);
      throw error;
    } finally {
      if (crawler) {
        await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
      }
      const endTime = new Date();
      log.endTime = endTime;
      log.duration = endTime.getTime() - startTime.getTime();
      await saveCrawlerLog(log);
    }

    return totalSaved;
  }

  /**
   * 步骤3: 更新 Bitmap 统计
   */
  async function step3_UpdateBitmap() {
    logger.info("\n📈 步骤3: 更新商品 Bitmap 统计...");

    try {
      const updatedCount = await updateAllProductsBitmap();
      logger.info(`   ✅ Bitmap 更新完成: ${updatedCount} 个商品`);
    } catch (error) {
      logger.error("   ❌ Bitmap 更新失败:", error);
      throw error;
    }
  }

  /**
   * 步骤4: 爬取商品社交提及（限制数量）
   */
  async function step4_CrawlMentions(headless, maxProducts = 50) {
    logger.info(`\n💬 步骤4: 爬取商品社交提及（前${maxProducts}个商品）...`);
    const startTime = new Date();

    const log = {
      taskType: "PRODUCT_MENTION",
      sourceType: "REDDIT",
      status: "RUNNING",
      startTime,
      itemsFound: 0,
      itemsSaved: 0,
    };

    let crawler = null;

    try {
      // 只获取部分商品（避免耗时太长）
      const productList = await db
        .select({ id: products.id, name: products.name })
        .from(products)
        .limit(maxProducts);

      logger.info(`   加载了 ${productList.length} 个商品`);

      crawler = new GoogleSearchCrawler(
        { headless, timeout: 60000 },
        { categoryConfig: { searchDelayRange: [3000, 5000] } }
      );

      let processedCount = 0;
      const date = new Date();

      for (const product of productList) {
        try {
          logger.info(`   处理商品 [${processedCount + 1}/${productList.length}]: ${product.name}`);

          const mentions = await crawler.crawlProductMentions(product.name, date);
          await saveProductSocialStats(product.id, date, mentions.periodResults);

          processedCount++;

          // 每处理10个商品延迟一下
          if (processedCount % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } catch (error) {
          logger.error(`   处理商品 ${product.name} 失败:`, error);
        }
      }

      log.status = "COMPLETED";
      log.itemsFound = productList.length;
      log.itemsSaved = processedCount;

      logger.info(`   ✅ 社交提及爬取完成: ${processedCount}/${productList.length}`);
    } catch (error) {
      log.status = "FAILED";
      log.errors = [{ message: error.message || String(error) }];
      logger.error("   ❌ 社交提及爬取失败:", error);
      throw error;
    } finally {
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
   * 步骤5: 生成趋势榜单
   */
  async function step5_GenerateTrends() {
    logger.info("\n🏆 步骤5: 生成趋势榜单...");

    try {
      await generateTrendRanks();
      logger.info("   ✅ 趋势榜单生成完成");
    } catch (error) {
      logger.error("   ❌ 趋势榜单生成失败:", error);
      throw error;
    }
  }

  // ========== 主逻辑 ==========
  const headless = process.argv.includes("--debug") ? false : true;
  const maxProductsArg = process.argv.find((arg) => arg.startsWith("--max-products="));
  const maxProducts = maxProductsArg ? parseInt(maxProductsArg.split("=")[1]) : 50;

  logger.info("\n" + "=".repeat(60));
  logger.info("🚀 开始爬取近30天数据到开发服务器");
  logger.info("=".repeat(60));
  logger.info(`📅 开始时间: ${new Date().toLocaleString()}`);
  logger.info(`👤 运行模式: ${headless ? "无头模式" : "调试模式（显示浏览器）"}`);
  logger.info(`📦 社交提及商品数限制: ${maxProducts}`);

  const totalStartTime = new Date();

  try {
    // 步骤1: 类目热度
    await step1_CategoryHeat(headless);

    // 步骤2: 爬取商品
    const savedProducts = await step2_CrawlProducts(headless);

    // 步骤3: 更新 Bitmap
    await step3_UpdateBitmap();

    // 步骤4: 社交提及（限制数量，避免耗时太长）
    await step4_CrawlMentions(headless, maxProducts);

    // 步骤5: 生成趋势榜单
    await step5_GenerateTrends();

    const totalEndTime = new Date();
    const duration = (totalEndTime.getTime() - totalStartTime.getTime()) / 1000;

    logger.info("\n" + "=".repeat(60));
    logger.info("✅ 近30天数据爬取完成！");
    logger.info("=".repeat(60));
    logger.info(`📊 新商品数: ${savedProducts}`);
    logger.info(`⏱️  总耗时: ${Math.floor(duration / 60)}分 ${Math.floor(duration % 60)}秒`);
    logger.info(`🏁 结束时间: ${totalEndTime.toLocaleString()}`);
    logger.info("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    logger.error("\n❌ 爬取任务失败:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("启动失败:", error);
  process.exit(1);
});
