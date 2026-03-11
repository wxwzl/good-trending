/**
 * 数据库查询工具
 * 提取重复的查询逻辑
 */
import {
  db,
  categories,
  products,
  productSocialStats,
  productAppearanceStats,
} from "@good-trending/database";
import { createSchedulerLogger } from "./logger.js";
import { gte, eq, inArray } from "drizzle-orm";

const logger = createSchedulerLogger("db-queries");

/**
 * 类目信息接口
 */
export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  searchKeywords: string | null;
}

/**
 * 商品信息接口
 */
export interface ProductInfo {
  id: string;
  name: string;
}

/**
 * 获取所有类目
 * @returns 类目列表
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  logger.debug("Fetching all categories");

  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      searchKeywords: categories.searchKeywords,
    })
    .from(categories);

  logger.debug(`Fetched ${result.length} categories`);

  return result as CategoryInfo[];
}

/**
 * 获取商品列表（带限制）
 * @param limit - 最大数量
 * @returns 商品列表
 */
export async function getProducts(limit: number): Promise<ProductInfo[]> {
  logger.debug(`Fetching up to ${limit} products`);

  const result = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .limit(limit);

  logger.debug(`Fetched ${result.length} products`);

  return result;
}

/**
 * 获取最近 N 天的商品
 * @param days - 天数
 * @returns 商品列表
 */
export async function getRecentProducts(days: number): Promise<{ id: string; createdAt: Date }[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  logger.debug(`Fetching products created after ${cutoffDate.toISOString()}`);

  const result = await db
    .select({
      id: products.id,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(gte(products.createdAt, cutoffDate));

  logger.debug(`Fetched ${result.length} recent products`);

  return result as { id: string; createdAt: Date }[];
}

/**
 * 获取今日社交统计数据
 * @param statDate - 统计日期 (YYYY-MM-DD)
 * @returns 社交统计数据
 */
export async function getTodaySocialStats(statDate: string) {
  logger.debug(`Fetching social stats for ${statDate}`);

  const result = await db
    .select({
      productId: productSocialStats.productId,
      todayRedditCount: productSocialStats.todayRedditCount,
      todayXCount: productSocialStats.todayXCount,
      yesterdayRedditCount: productSocialStats.yesterdayRedditCount,
      yesterdayXCount: productSocialStats.yesterdayXCount,
      thisWeekRedditCount: productSocialStats.thisWeekRedditCount,
      thisWeekXCount: productSocialStats.thisWeekXCount,
      thisMonthRedditCount: productSocialStats.thisMonthRedditCount,
      thisMonthXCount: productSocialStats.thisMonthXCount,
      last7DaysRedditCount: productSocialStats.last7DaysRedditCount,
      last7DaysXCount: productSocialStats.last7DaysXCount,
      last15DaysRedditCount: productSocialStats.last15DaysRedditCount,
      last15DaysXCount: productSocialStats.last15DaysXCount,
      last30DaysRedditCount: productSocialStats.last30DaysRedditCount,
      last30DaysXCount: productSocialStats.last30DaysXCount,
      last60DaysRedditCount: productSocialStats.last60DaysRedditCount,
      last60DaysXCount: productSocialStats.last60DaysXCount,
    })
    .from(productSocialStats)
    .where(eq(productSocialStats.statDate, statDate));

  logger.debug(`Fetched ${result.length} social stats records`);

  return result;
}

/**
 * 获取商品创建时间映射
 * @param productIds - 商品 ID 列表
 * @returns Map<productId, createdAt>
 */
export async function getProductCreateTimeMap(productIds: string[]): Promise<Map<string, Date>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const result = await db
    .select({
      id: products.id,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(inArray(products.id, productIds));

  return new Map(result.map((p) => [p.id, p.createdAt]));
}

/**
 * 商品出现统计接口
 */
export interface AppearanceStats {
  productId: string;
  last7DaysBitmap: bigint;
  last15DaysBitmap: bigint;
  last30DaysBitmap: bigint;
  last60DaysBitmap: bigint;
  lastUpdateDate: string | null;
}

/**
 * 获取商品出现频率统计（Bitmap 数据）
 * @param productIds - 商品 ID 列表
 * @returns 商品出现统计 Map
 */
export async function getProductAppearanceStats(
  productIds: string[]
): Promise<Map<string, AppearanceStats>> {
  if (productIds.length === 0) {
    return new Map();
  }

  logger.debug(`Fetching appearance stats for ${productIds.length} products`);

  try {
    const result = await db
      .select({
        productId: productAppearanceStats.productId,
        last7DaysBitmap: productAppearanceStats.last7DaysBitmap,
        last15DaysBitmap: productAppearanceStats.last15DaysBitmap,
        last30DaysBitmap: productAppearanceStats.last30DaysBitmap,
        last60DaysBitmap: productAppearanceStats.last60DaysBitmap,
        lastUpdateDate: productAppearanceStats.lastUpdateDate,
      })
      .from(productAppearanceStats)
      .where(inArray(productAppearanceStats.productId, productIds));

    logger.debug(`Fetched ${result.length} appearance stats records`);

    return new Map(
      result.map((r) => [
        r.productId,
        {
          productId: r.productId,
          last7DaysBitmap: BigInt(r.last7DaysBitmap || 0),
          last15DaysBitmap: BigInt(r.last15DaysBitmap || 0),
          last30DaysBitmap: BigInt(r.last30DaysBitmap || 0),
          last60DaysBitmap: BigInt(r.last60DaysBitmap || 0),
          lastUpdateDate: r.lastUpdateDate,
        },
      ])
    );
  } catch (error) {
    logger.error("Failed to fetch appearance stats", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Map();
  }
}

/**
 * 计算 Bitmap 中 1 的位数（人口计数）
 * @param bitmap - BigInt 位图
 * @returns 1 的位数
 */
function popCount(bitmap: bigint): number {
  let count = 0;
  let n = bitmap;
  while (n > 0n) {
    count += Number(n & 1n);
    n = n >> 1n;
  }
  return count;
}

/**
 * 计算商品出现频率得分
 * @param stats - 出现统计数据
 * @param period - 周期类型
 * @returns 频率得分 (0-1)
 */
export function calculateAppearanceScore(
  stats: AppearanceStats | undefined,
  period: string
): number {
  if (!stats) {
    return 0;
  }

  let bitmap: bigint;
  let maxDays: number;

  switch (period) {
    case "TODAY":
    case "YESTERDAY":
      bitmap = stats.last7DaysBitmap & 1n;
      maxDays = 1;
      break;
    case "LAST_7_DAYS":
    case "THIS_WEEK":
      bitmap = stats.last7DaysBitmap;
      maxDays = 7;
      break;
    case "LAST_15_DAYS":
      bitmap = stats.last15DaysBitmap;
      maxDays = 15;
      break;
    case "LAST_30_DAYS":
    case "THIS_MONTH":
      bitmap = stats.last30DaysBitmap;
      maxDays = 30;
      break;
    case "LAST_60_DAYS":
      bitmap = stats.last60DaysBitmap;
      maxDays = 60;
      break;
    default:
      bitmap = stats.last7DaysBitmap;
      maxDays = 7;
  }

  const activeDays = popCount(bitmap);
  return Math.min(activeDays / maxDays, 1);
}
