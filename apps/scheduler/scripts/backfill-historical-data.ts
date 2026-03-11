/**
 * 历史数据回填脚本
 * 从30天前开始，逐天模拟 yesterday-stats 任务爬取数据
 * 用于开发环境填充测试数据
 *
 * 环境变量加载:
 *   脚本自动加载环境变量（复用 loadEnv.js 逻辑，与 run.js 一致）:
 *   - .env
 *   - .env.local
 *   - .env.development (或 .env.production)
 *   - .env.development.local (或 .env.production.local)
 *
 * 用法:
 *   pnpm backfill                              # 默认回填30天，无头模式，保存到数据库
 *   pnpm backfill --days=7                     # 回填最近7天
 *   pnpm backfill --headless=false             # 显示浏览器窗口（调试用）
 *   pnpm backfill --dry-run                    # 模拟运行，不实际保存到数据库
 *
 * 命令行参数:
 *   --days=<number>       回填天数，默认30天
 *   --headless=<boolean>  是否无头模式，默认true
 *   --dry-run             模拟运行模式，只打印不保存
 *
 * 示例:
 *   # 回填7天数据，显示浏览器
 *   pnpm backfill --days=7 --headless=false
 *
 *   # 模拟回填3天，查看会爬取什么数据
 *   pnpm backfill --days=3 --dry-run
 *
 * 注意:
 *   - 需要确保数据库中有类目数据（运行 pnpm db:seed:categories:dev）
 *   - 如果启用AI分析，需要设置 ENABLE_AI_ANALYSIS=true 和相关API密钥
 *   - 每天处理5个类目，每类目最多20个商品
 *   - 每天之间有5秒延迟避免请求过快
 */

import { chromium } from "playwright";
import { createLoggerInstance } from "@good-trending/shared";
import {
  GoogleSearchService,
  createAmazonSearchService,
  createAIAnalyzer,
  createRedditService,
} from "@good-trending/crawler";
import {
  db,
  products,
  productCategories,
  categoryHeatStats,
  productAppearanceStats,
} from "@good-trending/database";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// 加载环境变量（复用 run.js 的环境加载逻辑）
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadEnv } = require("./loadEnv.js");
const { appEnv } = loadEnv({ command: "backfill", silent: false });

// 调试：确认环境变量已加载
console.log(`[backfill] 环境: ${appEnv}`);
console.log(`[backfill] ENABLE_AI_ANALYSIS=${process.env.ENABLE_AI_ANALYSIS}`);
console.log(`[backfill] AI_PROVIDER=${process.env.AI_PROVIDER || "kimi (default)"}`);

const logger = createLoggerInstance("backfill-historical");

interface BackfillConfig {
  /** 回填天数（默认30天） */
  days: number;
  /** 是否无头模式 */
  headless: boolean;
  /** 每天最大商品数 */
  maxProductsPerDay: number;
  /** 是否保存到数据库 */
  saveToDb: boolean;
}

/**
 * 获取类目列表
 */
async function getCategories() {
  const { getAllCategories } = await import("../src/utils/database-queries.js");
  return getAllCategories();
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 生成slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * 生成唯一slug
 */
async function generateUniqueSlug(slug: string): Promise<string> {
  const existing = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existing.length === 0) {
    return slug;
  }

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}

/**
 * 保存商品到数据库
 */
async function saveProduct(
  product: {
    amazonId: string;
    name: string;
    description?: string | null;
    image?: string | null;
    price?: number | null;
    currency?: string | null;
    url: string;
  },
  categoryId: string,
  date: Date,
  source: "LINK" | "AI" = "LINK"
) {
  // 检查是否已存在
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.amazonId, product.amazonId))
    .limit(1);

  if (existing.length > 0) {
    logger.debug(`商品已存在: ${product.name}`);
    return null;
  }

  const slug = generateSlug(product.name);
  const uniqueSlug = await generateUniqueSlug(slug);
  const productId = createId();

  await db.insert(products).values({
    id: productId,
    name: product.name,
    slug: uniqueSlug,
    description: product.description || null,
    image: product.image || null,
    price: product.price?.toString() || null,
    currency: product.currency,
    amazonId: product.amazonId,
    sourceUrl: product.url,
    discoveredFrom: "REDDIT",
    firstSeenAt: formatDate(date),
  });

  await db.insert(productCategories).values({
    productId,
    categoryId,
  });

  // 初始化 Bitmap（根据回填日期设置）
  const dayOffset = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const bitmapValue = 1n << BigInt(dayOffset);

  await db.insert(productAppearanceStats).values({
    productId,
    last7DaysBitmap: dayOffset < 7 ? bitmapValue : 0n,
    last15DaysBitmap: dayOffset < 15 ? bitmapValue : 0n,
    last30DaysBitmap: dayOffset < 30 ? bitmapValue : 0n,
    last60DaysBitmap: dayOffset < 60 ? bitmapValue : 0n,
    lastUpdateDate: formatDate(date),
  });

  logger.info(`保存商品 [${source}]: ${product.name.substring(0, 50)}...`);
  return productId;
}

/**
 * 保存类目热度统计
 */
async function saveCategoryHeat(
  categoryId: string,
  date: Date,
  redditCount: number,
  xCount: number
) {
  const dateStr = formatDate(date);

  // 检查是否已存在
  const existing = await db
    .select({ id: categoryHeatStats.id })
    .from(categoryHeatStats)
    .where(
      and(eq(categoryHeatStats.categoryId, categoryId), eq(categoryHeatStats.statDate, dateStr))
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新
    await db
      .update(categoryHeatStats)
      .set({
        redditResultCount: redditCount,
        xResultCount: xCount,
        crawledProductCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(categoryHeatStats.id, existing[0].id));
  } else {
    // 插入
    await db.insert(categoryHeatStats).values({
      id: createId(),
      categoryId,
      statDate: dateStr,
      redditResultCount: redditCount,
      xResultCount: xCount,
      crawledProductCount: 0,
    });
  }

  logger.info(`保存类目热度: ${categoryId} - Reddit: ${redditCount}, X: ${xCount}`);
}

/**
 * 执行单日爬取
 */
async function crawlForDate(
  date: Date,
  categories: Array<{ id: string; name: string }>,
  config: BackfillConfig
) {
  logger.info(`========================================`);
  logger.info(`开始爬取日期: ${formatDate(date)}`);
  logger.info(`========================================`);

  const googleSearch = new GoogleSearchService({ forceBrowser: true });
  const amazonService = createAmazonSearchService();
  const redditService = createRedditService();
  // AI 分析器延迟初始化，避免在禁用时抛出错误
  let aiAnalyzer: ReturnType<typeof createAIAnalyzer> | null = null;
  if (process.env.ENABLE_AI_ANALYSIS === "true") {
    try {
      aiAnalyzer = createAIAnalyzer();
      logger.info("AI 分析器已启用");
    } catch (error) {
      logger.warn(`AI 分析器初始化失败: ${error}`);
    }
  } else {
    logger.info("AI 分析已禁用，跳过 AI 分析器初始化");
  }

  const browser = await chromium.launch({ headless: config.headless });
  const page = await browser.newPage();

  const dateStr = formatDate(date);
  let totalProducts = 0;
  let totalHeatStats = 0;

  try {
    for (const category of categories.slice(0, 5)) {
      // 限制每天处理5个类目
      try {
        logger.info(`处理类目: ${category.name}`);

        // 1. 搜索类目热度（Reddit + X）
        const redditQuery = `site:reddit.com "${category.name}" after:${dateStr} before:${dateStr}`;
        const xQuery = `site:x.com "${category.name}" after:${dateStr} before:${dateStr}`;

        const [redditResult, xResult] = await Promise.all([
          googleSearch.search(redditQuery),
          googleSearch.search(xQuery),
        ]);

        const redditCount = redditResult.success ? redditResult.totalResults : 0;
        const xCount = xResult.success ? xResult.totalResults : 0;

        if (config.saveToDb) {
          await saveCategoryHeat(category.id, date, redditCount, xCount);
        }
        totalHeatStats++;

        // 2. 从搜索结果中提取商品
        const seenAsins = new Set<string>();
        const redditLinks =
          redditResult.links?.filter((link) => link.url.includes("reddit.com/r/")) || [];

        for (const link of redditLinks.slice(0, 10)) {
          // 检查是否是亚马逊链接
          const asinMatch = link.url.match(/\/dp\/(\w{10})/i);
          if (!asinMatch || seenAsins.has(asinMatch[1])) continue;

          const asin = asinMatch[1];
          seenAsins.add(asin);

          try {
            const productInfo = await amazonService.extractProductInfo(link.url);
            if (!productInfo) continue;

            if (config.saveToDb) {
              await saveProduct(
                {
                  amazonId: asin,
                  name: productInfo.name || link.title,
                  description: productInfo.description,
                  image: productInfo.image,
                  price: productInfo.price,
                  currency: productInfo.currency,
                  url: link.url,
                },
                category.id,
                date,
                "LINK"
              );
            }

            totalProducts++;

            if (totalProducts >= config.maxProductsPerDay) {
              logger.info(`达到每日商品上限: ${config.maxProductsPerDay}`);
              break;
            }
          } catch (error) {
            logger.warn(`提取商品失败: ${link.url} - ${error}`);
          }
        }

        // 3. AI分析（如果启用）
        if (aiAnalyzer && redditLinks.length > 0) {
          try {
            const postUrl = redditLinks[0].url;
            const post = await redditService.fetchPost(page, postUrl);
            const analysis = await aiAnalyzer.analyze({
              title: post.title,
              content: post.content || "",
              comments: post.comments,
            });

            if (analysis.keywords.length > 0) {
              for (const keyword of analysis.keywords.slice(0, 2)) {
                const amazonProducts = await amazonService.searchByKeyword(keyword, 3);
                for (const product of amazonProducts) {
                  if (seenAsins.has(product.asin)) continue;
                  seenAsins.add(product.asin);

                  if (config.saveToDb) {
                    await saveProduct(
                      {
                        amazonId: product.asin,
                        name: product.name,
                        image: product.image,
                        price: product.price,
                        currency: product.currency,
                        url: product.url,
                      },
                      category.id,
                      date,
                      "AI"
                    );
                  }

                  totalProducts++;
                }
              }
            }
          } catch (error) {
            logger.warn(`AI分析失败: ${error}`);
          }
        }

        // 延迟避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        logger.error(`处理类目失败 ${category.name}: ${error}`);
      }
    }
  } finally {
    await browser.close();
    await googleSearch.close();
    await amazonService.closeBrowser();
  }

  logger.info(`日期 ${dateStr} 完成: ${totalHeatStats} 个类目热度, ${totalProducts} 个商品`);
  return { heatStats: totalHeatStats, products: totalProducts };
}

/**
 * 主函数
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const daysArg = args.find((arg) => arg.startsWith("--days="));
  const headlessArg = args.find((arg) => arg.startsWith("--headless="));
  const dryRunArg = args.find((arg) => arg.startsWith("--dry-run"));

  const config: BackfillConfig = {
    days: daysArg ? parseInt(daysArg.split("=")[1]) : 30,
    headless: headlessArg ? headlessArg.split("=")[1] === "true" : true,
    maxProductsPerDay: 20,
    saveToDb: !dryRunArg,
  };

  logger.info("========================================");
  logger.info("历史数据回填任务");
  logger.info(`回填天数: ${config.days}`);
  logger.info(`无头模式: ${config.headless}`);
  logger.info(`保存到DB: ${config.saveToDb}`);
  logger.info("========================================");

  // 获取类目列表
  const categories = await getCategories();
  if (categories.length === 0) {
    logger.error("没有找到类目，请先运行类目种子脚本");
    process.exit(1);
  }
  logger.info(`获取到 ${categories.length} 个类目`);

  // 从30天前开始，逐天爬取
  const results = [];
  const today = new Date();

  for (let i = config.days; i >= 1; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - i);

    const result = await crawlForDate(targetDate, categories, config);
    results.push({ date: formatDate(targetDate), ...result });

    // 每天之间延迟5秒
    if (i > 1) {
      logger.info("等待5秒后继续下一天...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // 汇总结果
  logger.info("========================================");
  logger.info("回填任务完成！");
  logger.info("========================================");
  const totalHeat = results.reduce((sum, r) => sum + r.heatStats, 0);
  const totalProducts = results.reduce((sum, r) => sum + r.products, 0);
  logger.info(`总类目热度: ${totalHeat}`);
  logger.info(`总商品数: ${totalProducts}`);

  // 输出每天统计
  logger.info("\n每日统计:");
  for (const r of results) {
    logger.info(`  ${r.date}: 热度=${r.heatStats}, 商品=${r.products}`);
  }

  process.exit(0);
}

// 运行主函数
main().catch((error) => {
  logger.error(`任务失败: ${error}`);
  process.exit(1);
});
