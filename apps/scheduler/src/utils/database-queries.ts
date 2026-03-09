/**
 * 数据库查询工具
 * 提取重复的查询逻辑
 */
import { importDatabase } from "./dynamic-imports.js";
import { createSchedulerLogger } from "./logger.js";

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
  const dbMod = await importDatabase();
  const db = dbMod.db;
  const categories = dbMod.categories;

  logger.debug("Fetching all categories");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await db.select().from(categories as any);

  logger.debug(`Fetched ${result.length} categories`);

  return result as CategoryInfo[];
}

/**
 * 获取商品列表（带限制）
 * @param limit - 最大数量
 * @returns 商品列表
 */
export async function getProducts(limit: number): Promise<ProductInfo[]> {
  const dbMod = await importDatabase();
  const db = dbMod.db;
  const products = dbMod.products;

  logger.debug(`Fetching up to ${limit} products`);

  const result = await (
    db.select().from(products as any) as { limit: (n: number) => Promise<unknown[]> }
  ).limit(limit);

  logger.debug(`Fetched ${result.length} products`);

  return result as ProductInfo[];
}

/**
 * 获取最近 N 天的商品
 * @param days - 天数
 * @returns 商品列表
 */
export async function getRecentProducts(days: number): Promise<{ id: string; createdAt: Date }[]> {
  const dbMod = await importDatabase();
  const db = dbMod.db;
  const products = dbMod.products;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  logger.debug(`Fetching products created after ${cutoffDate.toISOString()}`);

  const { gte } = await import("drizzle-orm");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (db as any).select().from(products);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await (query.where as any)(gte((products as any).createdAt, cutoffDate));

  logger.debug(`Fetched ${result.length} recent products`);

  return result as { id: string; createdAt: Date }[];
}

/**
 * 获取今日社交统计数据
 * @param statDate - 统计日期 (YYYY-MM-DD)
 * @returns 社交统计数据
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTodaySocialStats(statDate: string): Promise<any[]> {
  const dbMod = await importDatabase();
  const db = dbMod.db;
  const productSocialStats = dbMod.productSocialStats;

  logger.debug(`Fetching social stats for ${statDate}`);

  const { eq } = await import("drizzle-orm");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = productSocialStats as Record<string, any>;

  const result = await db
    .select({
      productId: stats.productId,
      todayRedditCount: stats.todayRedditCount,
      todayXCount: stats.todayXCount,
      yesterdayRedditCount: stats.yesterdayRedditCount,
      yesterdayXCount: stats.yesterdayXCount,
      thisWeekRedditCount: stats.thisWeekRedditCount,
      thisWeekXCount: stats.thisWeekXCount,
      thisMonthRedditCount: stats.thisMonthRedditCount,
      thisMonthXCount: stats.thisMonthXCount,
      last7DaysRedditCount: stats.last7DaysRedditCount,
      last7DaysXCount: stats.last7DaysXCount,
      last15DaysRedditCount: stats.last15DaysRedditCount,
      last15DaysXCount: stats.last15DaysXCount,
      last30DaysRedditCount: stats.last30DaysRedditCount,
      last30DaysXCount: stats.last30DaysXCount,
      last60DaysRedditCount: stats.last60DaysRedditCount,
      last60DaysXCount: stats.last60DaysXCount,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(productSocialStats as any)
    .where(eq(stats.statDate, statDate));

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

  const dbMod = await importDatabase();
  const db = dbMod.db;
  const products = dbMod.products;

  const { inArray } = await import("drizzle-orm");

  const result = await db
    .select({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (products as Record<string, any>).id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (products as Record<string, any>).createdAt,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(products as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(inArray((products as Record<string, any>).id, productIds));

  return new Map(result.map((p: { id: string; createdAt: Date }) => [p.id, p.createdAt]));
}
