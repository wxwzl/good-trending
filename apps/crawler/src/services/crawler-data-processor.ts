/**
 * 爬虫数据处理器
 * 负责将爬取的数据保存到数据库，并更新 Bitmap 统计和趋势榜单
 */

import {
  db,
  categories,
  products,
  categoryHeatStats,
  productAppearanceStats,
  productSocialStats,
  trendRanks,
  crawlerLogs,
  productCategories,
} from "@good-trending/database";
import type { SourceType } from "@good-trending/database";
import { eq, and, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  type CategoryHeatResult,
  type CrawledProduct,
  type CrawlerLogData,
} from "../types/crawler.types";
import { updateBitmap } from "@good-trending/shared";

/**
 * 保存类目热度统计
 */
export async function saveCategoryHeatStats(
  stats: CategoryHeatResult[]
): Promise<number> {
  let savedCount = 0;

  for (const stat of stats) {
    try {
      // 检查是否已存在
      const existing = await db
        .select({ id: categoryHeatStats.id })
        .from(categoryHeatStats)
        .where(
          and(
            eq(categoryHeatStats.categoryId, stat.categoryId),
            eq(categoryHeatStats.statDate, stat.statDate.toISOString().split("T")[0])
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新 - 使用对象构建，只更新有值的字段
        const updateData: Record<string, number | Date> = {
          redditResultCount: stat.redditResultCount,
          xResultCount: stat.xResultCount,
          updatedAt: new Date(),
        };

        if (stat.yesterdayRedditCount !== undefined) {
          updateData.yesterdayRedditCount = stat.yesterdayRedditCount;
        }
        if (stat.yesterdayXCount !== undefined) {
          updateData.yesterdayXCount = stat.yesterdayXCount;
        }
        if (stat.last7DaysRedditCount !== undefined) {
          updateData.last7DaysRedditCount = stat.last7DaysRedditCount;
        }
        if (stat.last7DaysXCount !== undefined) {
          updateData.last7DaysXCount = stat.last7DaysXCount;
        }

        await db
          .update(categoryHeatStats)
          .set(updateData)
          .where(eq(categoryHeatStats.id, existing[0].id));
      } else {
        // 插入
        await db.insert(categoryHeatStats).values({
          id: createId(),
          categoryId: stat.categoryId,
          statDate: stat.statDate.toISOString().split("T")[0],
          redditResultCount: stat.redditResultCount,
          xResultCount: stat.xResultCount,
          yesterdayRedditCount: stat.yesterdayRedditCount ?? 0,
          yesterdayXCount: stat.yesterdayXCount ?? 0,
          last7DaysRedditCount: stat.last7DaysRedditCount ?? 0,
          last7DaysXCount: stat.last7DaysXCount ?? 0,
        });
      }

      savedCount++;
    } catch (error) {
      console.error(`保存类目热度统计失败 [${stat.categoryId}]:`, error);
    }
  }

  return savedCount;
}

/**
 * 保存爬取到的商品
 * 如果商品已存在（基于 amazonId），则跳过
 * 如果商品是新发现的，则创建记录并初始化 Bitmap 统计
 */
export async function saveCrawledProducts(
  productsData: CrawledProduct[],
  discoveredFrom: SourceType = "REDDIT"
): Promise<{
  savedCount: number;
  skippedCount: number;
  newProductIds: string[];
}> {
  let savedCount = 0;
  let skippedCount = 0;
  const newProductIds: string[] = [];

  for (const productData of productsData) {
    try {
      // 检查是否已存在
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.amazonId, productData.amazonId))
        .limit(1);

      if (existing.length > 0) {
        skippedCount++;
        continue;
      }

      // 生成 slug
      const slug = generateSlug(productData.name);
      const uniqueSlug = await generateUniqueSlug(slug);

      // 创建商品
      const productId = createId();
      await db.insert(products).values({
        id: productId,
        name: productData.name,
        slug: uniqueSlug,
        description: productData.description || null,
        image: null, // 可以从亚马逊页面获取，但这里简化处理
        price: productData.price?.toString() || null,
        currency: productData.currency,
        amazonId: productData.amazonId,
        sourceUrl: productData.sourceUrl,
        discoveredFrom,
        firstSeenAt: productData.firstSeenAt.toISOString().split("T")[0],
      });

      // 创建类目关联
      await db.insert(productCategories).values({
        productId,
        categoryId: productData.discoveredFromCategory,
      });

      // 初始化 Bitmap 统计
      await db.insert(productAppearanceStats).values({
        productId,
        last7DaysBitmap: 1, // 今天出现
        last15DaysBitmap: 1,
        last30DaysBitmap: 1,
        last60DaysBitmap: 1,
        lastUpdateDate: productData.firstSeenAt.toISOString().split("T")[0],
      });

      savedCount++;
      newProductIds.push(productId);
    } catch (error) {
      console.error(`保存商品失败 [${productData.amazonId}]:`, error);
    }
  }

  return { savedCount, skippedCount, newProductIds };
}

/**
 * 更新所有商品的 Bitmap 统计（滑动窗口）
 * 每天调用一次，更新近7/15/30/60天的出现记录
 */
export async function updateAllProductsBitmap(date: Date = new Date()): Promise<number> {
  const today = date.toISOString().split("T")[0];
  let updatedCount = 0;

  // 获取所有商品的统计记录
  const stats = await db
    .select({
      id: productAppearanceStats.id,
      productId: productAppearanceStats.productId,
      bitmap7: productAppearanceStats.last7DaysBitmap,
      bitmap15: productAppearanceStats.last15DaysBitmap,
      bitmap30: productAppearanceStats.last30DaysBitmap,
      bitmap60: productAppearanceStats.last60DaysBitmap,
      lastUpdateDate: productAppearanceStats.lastUpdateDate,
    })
    .from(productAppearanceStats);

  for (const stat of stats) {
    try {
      // 计算上次更新到今天的天数差
      const lastUpdate = stat.lastUpdateDate ? new Date(stat.lastUpdateDate) : date;
      const daysDiff = Math.floor(
        (date.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 0) {
        // 今天已经更新过
        continue;
      }

      // 检查商品今天是否出现在任何类目中
      const todayAppeared = await checkProductAppearedToday(stat.productId, today);

      // 使用 shared 包的 BigInt bitmap 函数
      let newBitmap7 = BigInt(stat.bitmap7 || 0);
      let newBitmap15 = BigInt(stat.bitmap15 || 0);
      let newBitmap30 = BigInt(stat.bitmap30 || 0);
      let newBitmap60 = BigInt(stat.bitmap60 || 0);

      // 滑动窗口更新（每天左移一位）
      for (let i = 0; i < daysDiff; i++) {
        newBitmap7 = updateBitmap(newBitmap7, 7, false);
        newBitmap15 = updateBitmap(newBitmap15, 15, false);
        newBitmap30 = updateBitmap(newBitmap30, 30, false);
        newBitmap60 = updateBitmap(newBitmap60, 60, false);
      }

      // 设置今天的状态
      if (todayAppeared) {
        newBitmap7 = newBitmap7 | 1n;
        newBitmap15 = newBitmap15 | 1n;
        newBitmap30 = newBitmap30 | 1n;
        newBitmap60 = newBitmap60 | 1n;
      }

      // 更新数据库
      await db
        .update(productAppearanceStats)
        .set({
          last7DaysBitmap: newBitmap7,
          last15DaysBitmap: newBitmap15,
          last30DaysBitmap: newBitmap30,
          last60DaysBitmap: newBitmap60,
          lastUpdateDate: today,
          updatedAt: new Date(),
        })
        .where(eq(productAppearanceStats.id, stat.id));

      updatedCount++;
    } catch (error) {
      console.error(`更新 Bitmap 失败 [${stat.productId}]:`, error);
    }
  }

  return updatedCount;
}

/**
 * 保存商品社交提及统计
 */
export async function saveProductSocialStats(
  productId: string,
  statDate: Date,
  periodResults: Record<
    string,
    { reddit: number; x: number }
  >
): Promise<void> {
  try {
    const today = periodResults["TODAY"] || { reddit: 0, x: 0 };
    const yesterday = periodResults["YESTERDAY"] || { reddit: 0, x: 0 };
    const thisWeek = periodResults["THIS_WEEK"] || { reddit: 0, x: 0 };
    const thisMonth = periodResults["THIS_MONTH"] || { reddit: 0, x: 0 };
    const last7Days = periodResults["LAST_7_DAYS"] || { reddit: 0, x: 0 };
    const last15Days = periodResults["LAST_15_DAYS"] || { reddit: 0, x: 0 };
    const last30Days = periodResults["LAST_30_DAYS"] || { reddit: 0, x: 0 };
    const last60Days = periodResults["LAST_60_DAYS"] || { reddit: 0, x: 0 };

    const dateStr = statDate.toISOString().split("T")[0];

    // 检查是否已存在
    const existing = await db
      .select({ id: productSocialStats.id })
      .from(productSocialStats)
      .where(
        and(
          eq(productSocialStats.productId, productId),
          eq(productSocialStats.statDate, dateStr)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 更新
      await db
        .update(productSocialStats)
        .set({
          todayRedditCount: today.reddit,
          todayXCount: today.x,
          yesterdayRedditCount: yesterday.reddit,
          yesterdayXCount: yesterday.x,
          thisWeekRedditCount: thisWeek.reddit,
          thisWeekXCount: thisWeek.x,
          thisMonthRedditCount: thisMonth.reddit,
          thisMonthXCount: thisMonth.x,
          last7DaysRedditCount: last7Days.reddit,
          last7DaysXCount: last7Days.x,
          last15DaysRedditCount: last15Days.reddit,
          last15DaysXCount: last15Days.x,
          last30DaysRedditCount: last30Days.reddit,
          last30DaysXCount: last30Days.x,
          last60DaysRedditCount: last60Days.reddit,
          last60DaysXCount: last60Days.x,
          updatedAt: new Date(),
        })
        .where(eq(productSocialStats.id, existing[0].id));
    } else {
      // 插入
      await db.insert(productSocialStats).values({
        id: createId(),
        productId,
        statDate: dateStr,
        todayRedditCount: today.reddit,
        todayXCount: today.x,
        yesterdayRedditCount: yesterday.reddit,
        yesterdayXCount: yesterday.x,
        thisWeekRedditCount: thisWeek.reddit,
        thisWeekXCount: thisWeek.x,
        thisMonthRedditCount: thisMonth.reddit,
        thisMonthXCount: thisMonth.x,
        last7DaysRedditCount: last7Days.reddit,
        last7DaysXCount: last7Days.x,
        last15DaysRedditCount: last15Days.reddit,
        last15DaysXCount: last15Days.x,
        last30DaysRedditCount: last30Days.reddit,
        last30DaysXCount: last30Days.x,
        last60DaysRedditCount: last60Days.reddit,
        last60DaysXCount: last60Days.x,
      });
    }
  } catch (error) {
    console.error(`保存商品社交统计失败 [${productId}]:`, error);
  }
}

/**
 * 生成趋势榜单
 * 基于社交提及数据计算各周期榜单
 */
export async function generateTrendRanks(date: Date = new Date()): Promise<void> {
  const dateStr = date.toISOString().split("T")[0];

  const periods = [
    "TODAY",
    "YESTERDAY",
    "THIS_WEEK",
    "THIS_MONTH",
    "LAST_7_DAYS",
    "LAST_15_DAYS",
    "LAST_30_DAYS",
  ] as const;

  for (const period of periods) {
    try {
      // 获取该周期的统计数据
      const stats = await getProductStatsByPeriod(period, dateStr);

      // 计算趋势分数并排序
      const rankedProducts = stats
        .map((stat) => ({
          productId: stat.productId,
          // 趋势分数 = Reddit 提及数 + X 提及数 * 权重
          score: stat.redditCount + stat.xCount * 0.8,
          redditCount: stat.redditCount,
          xCount: stat.xCount,
        }))
        .sort((a, b) => b.score - a.score);

      // 保存榜单（前 2000 名）
      const topProducts = rankedProducts.slice(0, 2000);

      for (let i = 0; i < topProducts.length; i++) {
        const product = topProducts[i];
        await db.insert(trendRanks).values({
          id: createId(),
          productId: product.productId,
          periodType: period,
          statDate: dateStr,
          rank: i + 1,
          score: product.score,
          redditMentions: product.redditCount,
          xMentions: product.xCount,
          sourceData: {
            calculationMethod: "reddit + x*0.8",
          },
        });
      }

      console.log(`生成 ${period} 榜单完成，共 ${topProducts.length} 个商品`);
    } catch (error) {
      console.error(`生成榜单失败 [${period}]:`, error);
    }
  }
}

/**
 * 保存爬虫日志
 */
export async function saveCrawlerLog(log: CrawlerLogData): Promise<void> {
  try {
    await db.insert(crawlerLogs).values({
      id: createId(),
      taskType: log.taskType,
      sourceType: log.sourceType,
      categoryId: log.categoryId || null,
      status: log.status,
      startTime: log.startTime,
      endTime: log.endTime || null,
      duration: log.duration || 0,
      itemsFound: log.itemsFound,
      itemsSaved: log.itemsSaved,
      errors: log.errors || [],
      metadata: log.metadata || {},
    });
  } catch (error) {
    console.error("保存爬虫日志失败:", error);
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成 slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\p{P}\p{S}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

/**
 * 生成唯一 slug
 */
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;

    if (counter > 100) {
      // 使用随机后缀
      slug = `${baseSlug}-${createId().substring(0, 8)}`;
      return slug;
    }
  }
}

/**
 * 检查商品今天是否出现在任何类目中
 * 通过检查该商品关联的类目今天是否有爬取记录
 */
async function checkProductAppearedToday(
  productId: string,
  today: string
): Promise<boolean> {
  // 查询该商品关联的类目今天是否有爬取记录
  const result = await db
    .select({
      totalCrawled: sql`coalesce(sum(${categoryHeatStats.crawledProductCount}), 0)`.mapWith(Number),
    })
    .from(productCategories)
    .innerJoin(
      categoryHeatStats,
      and(
        eq(productCategories.categoryId, categoryHeatStats.categoryId),
        eq(categoryHeatStats.statDate, today)
      )
    )
    .where(eq(productCategories.productId, productId));

  // 如果有类目今天被爬取且爬取到了商品，则认为该商品今天出现
  return (result[0]?.totalCrawled ?? 0) > 0;
}

/**
 * 获取指定周期的商品统计数据
 */
async function getProductStatsByPeriod(
  period: string,
  dateStr: string
): Promise<Array<{ productId: string; redditCount: number; xCount: number }>> {
  // 根据周期选择字段
  const redditField = getPeriodField(period, "reddit");
  const xField = getPeriodField(period, "x");

  const result = await db
    .select({
      productId: productSocialStats.productId,
      redditCount: sql`${sql.raw(redditField)}`.mapWith(Number),
      xCount: sql`${sql.raw(xField)}`.mapWith(Number),
    })
    .from(productSocialStats)
    .where(eq(productSocialStats.statDate, dateStr));

  return result;
}

/**
 * 获取周期对应的字段名
 */
function getPeriodField(period: string, platform: "reddit" | "x"): string {
  const prefix = platform === "reddit" ? "today_reddit_count" : "today_x_count";

  const fieldMap: Record<string, string> = {
    TODAY: prefix.replace("today_", "today_"),
    YESTERDAY: prefix.replace("today_", "yesterday_"),
    THIS_WEEK: prefix.replace("today_", "this_week_"),
    THIS_MONTH: prefix.replace("today_", "this_month_"),
    LAST_7_DAYS: prefix.replace("today_", "last_7_days_"),
    LAST_15_DAYS: prefix.replace("today_", "last_15_days_"),
    LAST_30_DAYS: prefix.replace("today_", "last_30_days_"),
  };

  return fieldMap[period] || prefix;
}
