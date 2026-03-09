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

    // ========== 步骤1: 爬取昨天类目热度和商品（合并处理） ==========
    logger.info(`\n📊 步骤1: 爬取昨天类目热度和商品...`);
    await crawlYesterdayData(currentDate, headless);

    // ========== 步骤2: 更新 Bitmap 统计 ==========
    logger.info(`\n📈 步骤2: 更新 Bitmap 统计...`);
    const bitmapUpdated = await updateAllProductsBitmap(currentDate);
    logger.info(`   ✅ Bitmap 更新完成: ${bitmapUpdated} 个商品`);

    // ========== 步骤3: 爬取社交提及（限制数量） ==========
    logger.info(`\n💬 步骤3: 爬取商品社交提及...`);
    await crawlProductMentions(currentDate, headless, 30);

    // 注意: 趋势榜单由 scheduler 定时任务生成，不在爬虫流程中处理
    logger.info(`\nℹ️  趋势榜单将由 scheduler 定时任务自动生成`);

    logger.info(`\n✅ ${dateStr} 定时任务完成`);
  }

  /**
   * 爬取昨天数据（类目热度 + 商品发现，合并处理）
   * 访问一个类目搜索页时，同时记录热度并提取商品，避免重复遍历
   */
  async function crawlYesterdayData(currentDate, headless) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const startTime = new Date();
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(currentDate);

    // 类目热度统计日志
    const heatLog = {
      taskType: "CATEGORY_HEAT",
      sourceType: "REDDIT",
      status: "RUNNING",
      startTime,
      itemsFound: 0,
      itemsSaved: 0,
    };

    // 商品发现日志
    const productLog = {
      taskType: "PRODUCT_DISCOVERY",
      sourceType: "REDDIT",
      status: "RUNNING",
      startTime,
      itemsFound: 0,
      itemsSaved: 0,
    };

    let crawler = null;
    const seenAsins = new Set<string>(); // 用于商品去重
    const heatStats = []; // 类目热度统计
    let totalProductsFound = 0;
    let totalProductsSaved = 0;
    let totalProductsSkipped = 0;
    const errors: string[] = [];

    try {
      const categoryList = await getAllCategories();
      logger.info(`   加载了 ${categoryList.length} 个类目`);

      // 测试模式：限制类目数量
      const maxCategories = parseInt(process.env.CRAWLER_MAX_CATEGORIES || "0", 10);
      const categoriesToProcess =
        maxCategories > 0 ? categoryList.slice(0, maxCategories) : categoryList;
      if (maxCategories > 0 && categoriesToProcess.length < categoryList.length) {
        logger.info(`   测试模式：限制处理 ${categoriesToProcess.length} 个类目`);
      }

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

      // 初始化浏览器
      await crawler.initBrowser();

      // 逐个类目处理：同时记录热度并提取商品
      for (let i = 0; i < categoriesToProcess.length; i++) {
        const category = categoriesToProcess[i];
        logger.info(`   [${i + 1}/${categoriesToProcess.length}] 处理类目: ${category.name}`);

        try {
          const keyword = category.searchKeywords || category.name;

          // ===== 搜索 Reddit（昨天一天）=====
          const redditQuery = `site:reddit.com "${keyword}" after:${yesterdayStr} before:${todayStr}`;
          logger.info(`   搜索 Reddit: ${redditQuery}`);

          const redditResult = await crawler.performGoogleSearch(redditQuery);
          logger.info(`   Reddit 结果: ${redditResult.links.length} 个`);

          // 延迟后搜索 X
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // ===== 搜索 X（昨天一天）=====
          const xQuery = `site:x.com "${keyword}" after:${yesterdayStr} before:${todayStr}`;
          logger.info(`   搜索 X: ${xQuery}`);

          const xResult = await crawler.performGoogleSearch(xQuery);
          logger.info(`   X 结果: ${xResult.links.length} 个`);

          // ===== 记录类目热度 =====
          heatStats.push({
            categoryId: category.id,
            categoryName: category.name,
            statDate: yesterday,
            redditResultCount: 0, // 今天数据为0
            xResultCount: 0,
            yesterdayRedditCount: redditResult.totalResults || redditResult.links.length,
            yesterdayXCount: xResult.totalResults || xResult.links.length,
          });

          // ===== 提取商品（边爬边保存）=====
          let categorySavedCount = 0;
          let categoryDuplicateCount = 0;

          await crawler.extractAmazonProductsFromLinks(
            redditResult.links.slice(0, 30),
            async (product) => {
              // 全局去重检查
              if (seenAsins.has(product.amazonId)) {
                categoryDuplicateCount++;
                return;
              }
              seenAsins.add(product.amazonId);

              // 立即保存商品
              const productWithCategory = {
                ...product,
                discoveredFromCategory: category.id,
                firstSeenAt: yesterday,
              };

              const saveResult = await saveCrawledProducts([productWithCategory], "REDDIT");
              if (saveResult.savedCount > 0) {
                categorySavedCount++;
                totalProductsSaved++;
              } else if (saveResult.skippedCount > 0) {
                categoryDuplicateCount++;
                totalProductsSkipped++;
              }
            }
          );

          totalProductsFound += categorySavedCount + categoryDuplicateCount;

          logger.info(
            `   ✅ 类目 [${category.name}] 完成: 热度(R:${redditResult.links.length},X:${xResult.links.length}), 新商品:${categorySavedCount}, 重复:${categoryDuplicateCount}`
          );

          // 类目间延迟避免被封
          const delay = Math.floor(Math.random() * 5000) + 5000; // 5-10秒
          logger.info(`   ⏳ 等待 ${delay}ms 后处理下一个类目...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } catch (error) {
          const errorMsg = `处理类目 [${category.name}] 失败: ${error.message || String(error)}`;
          logger.error(`   ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // 保存类目热度统计
      const heatSavedCount = await saveCategoryHeatStats(heatStats);
      heatLog.status = "COMPLETED";
      heatLog.itemsFound = heatStats.length;
      heatLog.itemsSaved = heatSavedCount;
      logger.info(`   ✅ 类目热度保存完成: ${heatSavedCount} 条`);

      // 商品发现日志
      productLog.status = errors.length === 0 ? "COMPLETED" : "FAILED";
      productLog.itemsFound = totalProductsFound;
      productLog.itemsSaved = totalProductsSaved;
      logger.info(
        `   ✅ 商品爬取完成: 新商品 ${totalProductsSaved}, 跳过 ${totalProductsSkipped}, 错误 ${errors.length}`
      );
    } catch (error) {
      heatLog.status = "FAILED";
      productLog.status = "FAILED";
      const errorMsg = { message: error.message || String(error) };
      heatLog.errors = [errorMsg];
      productLog.errors = [errorMsg];
      logger.error("   ❌ 数据爬取失败:", error);
    } finally {
      if (crawler) {
        await crawler.closeBrowser().catch((err) => logger.error("关闭浏览器失败:", err));
      }
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      heatLog.endTime = endTime;
      heatLog.duration = duration;
      productLog.endTime = endTime;
      productLog.duration = duration;

      // 保存爬虫日志
      await saveCrawlerLog(heatLog);
      await saveCrawlerLog(productLog);
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
