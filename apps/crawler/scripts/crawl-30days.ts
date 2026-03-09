#!/usr/bin/env node
/**
 * 爬取近30天数据脚本（按天模拟）
 * 从2月9号开始，一天一天地爬取，模拟每天的定时任务
 *
 * 使用方法:
 * tsx scripts/crawl-30days.ts           # 无头模式（默认）
 * tsx scripts/crawl-30days.ts --debug   # 有界面模式（用于调试）
 */

// ========== 加载环境变量 ==========
import { loadEnv, validateDatabaseConfig, printEnvInfo } from "./load-env";

const envInfo = loadEnv({ command: "dev" });
printEnvInfo(envInfo);

if (!validateDatabaseConfig()) {
  process.exit(1);
}

console.log("✅ 环境变量加载完成\n");
// =================================

// 动态导入 ES 模块
async function main() {
  const { createLogger, format, transports } = await import("winston");
  const { db, categories, products } = await import("@good-trending/database");
  const { GoogleSearchCrawler } = await import("../src/crawlers/GoogleSearchCrawler");
  const {
    saveCategoryHeatStats,
    saveCrawledProducts,
    saveProductSocialStats,
    updateAllProductsBitmap,
    saveCrawlerLog,
  } = await import("../src/services/crawler-data-processor");

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
   * 格式化日期为 YYYY-MM-DD
   */
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  /**
   * 模拟单天的定时任务（凌晨执行）
   * 包括：昨天数据统计、Bitmap更新、趋势榜单生成
   */
  async function runDailyTask(currentDate, headless) {
    const dateStr = formatDate(currentDate);
    logger.info(`\n${"=".repeat(60)}`);
    logger.info(`📅 模拟 ${dateStr} 的定时任务`);
    logger.info("=".repeat(60));

    // ========== 步骤1: 爬取昨天类目热度 ==========
    logger.info(`\n📊 步骤1: 爬取昨天类目热度...`);
    await crawlYesterdayCategoryHeat(currentDate, headless);

    // ========== 步骤2: 爬取昨天商品 ==========
    logger.info(`\n🛍️ 步骤2: 爬取昨天商品...`);
    await crawlYesterdayProducts(currentDate, headless);

    // ========== 步骤3: 更新 Bitmap 统计 ==========
    logger.info(`\n📈 步骤3: 更新 Bitmap 统计...`);
    const bitmapUpdated = await updateAllProductsBitmap(currentDate);
    logger.info(`   ✅ Bitmap 更新完成: ${bitmapUpdated} 个商品`);

    // ========== 步骤4: 爬取社交提及（限制数量） ==========
    logger.info(`\n💬 步骤4: 爬取商品社交提及...`);
    await crawlProductMentions(currentDate, headless, 30);

    // 注意: 趋势榜单由 scheduler 定时任务生成，不在爬虫流程中处理
    logger.info(`\nℹ️  趋势榜单将由 scheduler 定时任务自动生成`);

    logger.info(`\n✅ ${dateStr} 定时任务完成`);
  }

  /**
   * 爬取昨天类目热度
   */
  async function crawlYesterdayCategoryHeat(currentDate, headless) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

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

      // 爬取昨天类目热度
      const result = await crawler.crawlYesterdayCategoryHeat(categoryList, currentDate);
      const savedCount = await saveCategoryHeatStats(result.data);

      log.status = result.success ? "COMPLETED" : "FAILED";
      log.itemsFound = result.data.length;
      log.itemsSaved = savedCount;

      logger.info(`   ✅ 昨天类目热度保存完成: ${savedCount} 条`);
    } catch (error) {
      log.status = "FAILED";
      log.errors = [{ message: error.message || String(error) }];
      logger.error("   ❌ 昨天类目热度爬取失败:", error);
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
   * 爬取昨天商品
   */
  async function crawlYesterdayProducts(currentDate, headless) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

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

      // 爬取昨天商品
      const result = await crawler.crawlYesterdayProducts(categoryList, currentDate);
      const saveResult = await saveCrawledProducts(result.data, "REDDIT");

      log.status = result.success ? "COMPLETED" : "FAILED";
      log.itemsFound = result.data.length;
      log.itemsSaved = saveResult.savedCount;

      logger.info(
        `   ✅ 昨天商品爬取完成: 新商品 ${saveResult.savedCount}, 跳过 ${saveResult.skippedCount}`
      );
    } catch (error) {
      log.status = "FAILED";
      log.errors = [{ message: error.message || String(error) }];
      logger.error("   ❌ 昨天商品爬取失败:", error);
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
   * 爬取商品社交提及
   */
  async function crawlProductMentions(currentDate, headless, maxProducts = 30) {
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
      // 只获取部分商品
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

      for (const product of productList) {
        try {
          logger.info(`   处理商品 [${processedCount + 1}/${productList.length}]: ${product.name}`);

          const mentions = await crawler.crawlProductMentions(product.name, currentDate);
          await saveProductSocialStats(product.id, currentDate, mentions.periodResults);

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

  // ========== 主逻辑 ==========
  const headless = process.argv.includes("--debug") ? false : true;

  // 从2月9号开始
  const startDate = new Date("2025-02-09");
  const endDate = new Date(); // 今天

  logger.info("\n" + "=".repeat(60));
  logger.info("🚀 开始模拟近30天定时任务");
  logger.info("=".repeat(60));
  logger.info(`📅 开始日期: ${formatDate(startDate)}`);
  logger.info(`📅 结束日期: ${formatDate(endDate)}`);
  logger.info(`👤 运行模式: ${headless ? "无头模式" : "调试模式（显示浏览器）"}`);
  logger.info("=".repeat(60) + "\n");

  const totalStartTime = new Date();
  let dayCount = 0;

  try {
    // 一天一天地循环
    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      dayCount++;
      await runDailyTask(new Date(currentDate), headless);

      // 每天之间稍微延迟一下，避免太频繁
      if (currentDate < endDate) {
        logger.info("\n⏳ 等待3秒后开始下一天...\n");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const totalEndTime = new Date();
    const duration = (totalEndTime.getTime() - totalStartTime.getTime()) / 1000;

    logger.info("\n" + "=".repeat(60));
    logger.info("✅ 近30天定时任务模拟完成！");
    logger.info("=".repeat(60));
    logger.info(`📊 处理天数: ${dayCount} 天`);
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
