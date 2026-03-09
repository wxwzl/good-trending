/**
 * 趋势分数计算器
 * 提供趋势分数计算和周期数据获取功能
 */
import { formatDate } from "@good-trending/shared";
import { createSchedulerLogger } from "../../utils/logger.js";
import {
  getTodaySocialStats,
  getProductCreateTimeMap,
  getRecentProducts,
  getProductAppearanceStats,
  calculateAppearanceScore,
  type AppearanceStats,
} from "../../utils/database-queries.js";
import { importDatabase } from "../../utils/dynamic-imports.js";
import { TRENDING_CONFIG, PERIOD_TYPES } from "../../constants/index.js";
import type { PeriodType } from "../../types/index.js";

const logger = createSchedulerLogger("trending-calculator");

/**
 * 社交统计数据接口
 */
interface SocialStats {
  productId: string;
  todayRedditCount: number;
  todayXCount: number;
  yesterdayRedditCount: number;
  yesterdayXCount: number;
  thisWeekRedditCount: number;
  thisWeekXCount: number;
  thisMonthRedditCount: number;
  thisMonthXCount: number;
  last7DaysRedditCount: number;
  last7DaysXCount: number;
  last15DaysRedditCount: number;
  last15DaysXCount: number;
  last30DaysRedditCount: number;
  last30DaysXCount: number;
  last60DaysRedditCount: number;
  last60DaysXCount: number;
}

/**
 * 排名商品接口
 */
interface RankedProduct {
  productId: string;
  score: number;
  redditMentions: number;
  xMentions: number;
}

/**
 * 根据周期获取对应的字段值
 *
 * @param period - 周期类型
 * @param stat - 社交统计数据
 * @returns Reddit 和 X 平台的提及数
 */
export function getSocialCountsByPeriod(
  period: PeriodType,
  stat: SocialStats
): { redditCount: number; xCount: number } {
  switch (period) {
    case "TODAY":
      return { redditCount: stat.todayRedditCount, xCount: stat.todayXCount };
    case "YESTERDAY":
      return { redditCount: stat.yesterdayRedditCount, xCount: stat.yesterdayXCount };
    case "THIS_WEEK":
      return { redditCount: stat.thisWeekRedditCount, xCount: stat.thisWeekXCount };
    case "THIS_MONTH":
      return { redditCount: stat.thisMonthRedditCount, xCount: stat.thisMonthXCount };
    case "LAST_7_DAYS":
      return { redditCount: stat.last7DaysRedditCount, xCount: stat.last7DaysXCount };
    case "LAST_15_DAYS":
      return { redditCount: stat.last15DaysRedditCount, xCount: stat.last15DaysXCount };
    case "LAST_30_DAYS":
      return { redditCount: stat.last30DaysRedditCount, xCount: stat.last30DaysXCount };
    case "LAST_60_DAYS":
      return { redditCount: stat.last60DaysRedditCount, xCount: stat.last60DaysXCount };
    default:
      return { redditCount: stat.todayRedditCount, xCount: stat.todayXCount };
  }
}

/**
 * 计算趋势分数
 *
 * @description
 * 基于社交提及数据和出现频率计算综合热门度分数：
 * 1. Reddit 提及数（权重 1.0）
 * 2. X 平台提及数（权重 0.8）
 * 3. 出现频率：出现天数越多分数越高（权重 0.3）
 * 4. 时间衰减：越新的商品分数越高
 *
 * @param redditCount - Reddit 提及数
 * @param xCount - X 平台提及数
 * @param createdAt - 商品创建时间
 * @param appearanceScore - 出现频率得分 (0-1)
 * @returns 趋势分数（非负数）
 */
export function calculateTrendingScore(
  redditCount: number,
  xCount: number,
  createdAt: Date,
  appearanceScore: number = 0
): number {
  // 基础分数：Reddit 提及数 + X 提及数 * 权重
  let baseScore = redditCount + xCount * TRENDING_CONFIG.X_MENTION_WEIGHT;

  // 出现频率加成：出现越频繁，基础分数越高（最高 50% 加成）
  const appearanceBonus = 1 + appearanceScore * 0.5;
  let score = baseScore * appearanceBonus;

  // 时间衰减因子：越新的商品权重越高
  const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const timeDecay = Math.max(
    TRENDING_CONFIG.TIME_DECAY_MIN_FACTOR,
    1 - daysSinceCreated / TRENDING_CONFIG.TIME_DECAY_MAX_DAYS
  );
  score = score * timeDecay;

  // 确保分数非负
  return Math.max(0, score);
}

/**
 * 为指定周期生成趋势榜单
 *
 * @param period - 周期类型
 * @param statDate - 统计日期 (YYYY-MM-DD)
 * @returns 排名的商品列表
 */
export async function generateRanksForPeriod(
  period: PeriodType,
  statDate: string
): Promise<RankedProduct[]> {
  logger.info(`Generating trend ranks for period: ${period}`);

  const socialStats = await getTodaySocialStats(statDate);

  if (socialStats.length === 0) {
    logger.info(`No social stats found for period ${period}`);
    return [];
  }

  const productIds = socialStats.map((s) => s.productId);
  const [productCreateTimeMap, appearanceStatsMap] = await Promise.all([
    getProductCreateTimeMap(productIds),
    getProductAppearanceStats(productIds),
  ]);

  // 计算趋势分数并排序
  const rankedProducts = socialStats
    .map((stat) => {
      const { redditCount, xCount } = getSocialCountsByPeriod(period, stat as SocialStats);
      const createdAt = productCreateTimeMap.get(stat.productId) || new Date();

      // 计算出现频率得分
      const appearanceStats = appearanceStatsMap.get(stat.productId);
      const appearanceScore = calculateAppearanceScore(appearanceStats, period);

      const score = calculateTrendingScore(redditCount, xCount, createdAt, appearanceScore);

      return {
        productId: stat.productId,
        score,
        redditMentions: redditCount,
        xMentions: xCount,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 取前 N 名
  return rankedProducts.slice(0, TRENDING_CONFIG.MAX_RANKS);
}

/**
 * 批量保存趋势榜单数据
 *
 * @param period - 周期类型
 * @param statDate - 统计日期
 * @param rankedProducts - 排名的商品列表
 * @returns 保存的记录数
 */
export async function saveTrendRanks(
  period: PeriodType,
  statDate: string,
  rankedProducts: RankedProduct[]
): Promise<number> {
  if (rankedProducts.length === 0) {
    return 0;
  }

  const { db, trendRanks } = await importDatabase();
  const { and, eq } = await import("drizzle-orm");
  const { createId } = await import("@paralleldrive/cuid2");

  // 先删除该周期旧数据
  await db
    .delete(trendRanks)
    .where(and(eq(trendRanks.periodType, period), eq(trendRanks.statDate, statDate)));

  // 准备插入数据
  const insertData = rankedProducts.map((product, index) => ({
    id: createId(),
    productId: product.productId,
    periodType: period,
    statDate: statDate,
    rank: index + 1,
    score: product.score,
    redditMentions: product.redditMentions,
    xMentions: product.xMentions,
    sourceData: { calculationMethod: "reddit + x*0.8" },
  }));

  // 分批插入
  for (let i = 0; i < insertData.length; i += TRENDING_CONFIG.BATCH_SIZE) {
    const batch = insertData.slice(i, i + TRENDING_CONFIG.BATCH_SIZE);
    await db.insert(trendRanks).values(batch);
  }

  logger.info(`Generated ${rankedProducts.length} ranks for period ${period}`);

  return rankedProducts.length;
}

/**
 * 清除趋势缓存
 */
export async function clearTrendingCache(): Promise<void> {
  try {
    const { getRedisClient } = await importDatabase();
    const redis = getRedisClient();
    const keys = await redis.keys("trending:*");

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    logger.info("Cleared trending cache", { keysRemoved: keys.length });
  } catch (error) {
    logger.warn("Failed to clear trending cache", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 生成所有周期的趋势榜单
 *
 * @returns 更新的总记录数
 */
export async function updateTrendingData(): Promise<number> {
  logger.info("Starting trending ranks generation...");

  const today = formatDate(new Date());
  let totalUpdatedCount = 0;

  for (const period of PERIOD_TYPES) {
    try {
      const rankedProducts = await generateRanksForPeriod(period as PeriodType, today);
      const savedCount = await saveTrendRanks(period as PeriodType, today, rankedProducts);
      totalUpdatedCount += savedCount;
    } catch (error) {
      logger.error(`Failed to generate trend ranks for period ${period}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 清除缓存
  await clearTrendingCache();

  logger.info(`Trending ranks generation completed: ${totalUpdatedCount} records updated`);

  return totalUpdatedCount;
}

/**
 * 计算今日趋势分数
 *
 * @returns 计算的商品数量
 */
export async function calculateAllTrendingScores(): Promise<number> {
  logger.info("Starting TODAY trending score calculation...");

  const today = formatDate(new Date());

  // 获取最近 30 天的商品
  const recentProducts = await getRecentProducts(30);

  logger.info(`Found ${recentProducts.length} recent products to calculate`);

  // 获取今天的社交统计数据和出现频率统计
  const [socialStats, appearanceStatsMap] = await Promise.all([
    getTodaySocialStats(today),
    getProductAppearanceStats(recentProducts.map((p) => p.id)),
  ]);
  const socialStatsMap = new Map(socialStats.map((s) => [s.productId, s]));

  // 计算每个商品的分数
  const scoredProducts = recentProducts.map((product) => {
    const stat = socialStatsMap.get(product.id);
    const redditCount = stat?.todayRedditCount || 0;
    const xCount = stat?.todayXCount || 0;

    // 计算出现频率得分
    const appearanceStats = appearanceStatsMap.get(product.id);
    const appearanceScore = calculateAppearanceScore(appearanceStats, "TODAY");

    const score = calculateTrendingScore(redditCount, xCount, product.createdAt, appearanceScore);

    return {
      productId: product.id,
      score,
      redditMentions: redditCount,
      xMentions: xCount,
    };
  });

  // 按分数排序
  const rankedProducts = scoredProducts.sort((a, b) => b.score - a.score);

  // 保存榜单
  const savedCount = await saveTrendRanks("TODAY", today, rankedProducts);

  logger.info(`TODAY trend ranks calculation completed: ${savedCount} products processed`);

  return savedCount;
}
