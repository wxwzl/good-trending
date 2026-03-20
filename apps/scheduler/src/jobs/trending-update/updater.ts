/**
 * 趋势更新器
 * 从 processors/trending/calculator.ts 迁移而来
 * 负责 updateTrendingData + clearTrendingCache 逻辑
 */
import { formatDate } from "@good-trending/shared";
import { createSchedulerLogger } from "../../utils/logger.js";
import {
  getTodaySocialStats,
  getProductCreateTimeMap,
  getProductAppearanceStats,
  calculateAppearanceScore,
} from "../../utils/database-queries.js";
import { db, trendRanks, getRedisClient } from "@good-trending/database";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { TRENDING_CONFIG, PERIOD_TYPES } from "../../constants/index.js";
import type { PeriodType } from "../../types/index.js";
import { calculateTrendingScore } from "../trending-calculate/calculator.js";

const logger = createSchedulerLogger("trending-update");

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
 * 根据周期获取对应的社交统计数字
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
 * 批量保存趋势榜单
 */
async function saveTrendRanks(
  period: PeriodType,
  statDate: string,
  rankedProducts: RankedProduct[]
): Promise<number> {
  if (rankedProducts.length === 0) {
    return 0;
  }

  await db
    .delete(trendRanks)
    .where(and(eq(trendRanks.periodType, period), eq(trendRanks.statDate, statDate)));

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

  for (let i = 0; i < insertData.length; i += TRENDING_CONFIG.BATCH_SIZE) {
    const batch = insertData.slice(i, i + TRENDING_CONFIG.BATCH_SIZE);
    await db.insert(trendRanks).values(batch);
  }

  logger.info(`Generated ${rankedProducts.length} ranks for period ${period}`);

  return rankedProducts.length;
}

/**
 * 为指定周期生成趋势榜单
 */
async function generateRanksForPeriod(
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

  const rankedProducts = socialStats
    .map((stat) => {
      const { redditCount, xCount } = getSocialCountsByPeriod(period, stat as SocialStats);
      const createdAt = productCreateTimeMap.get(stat.productId) || new Date();

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

  return rankedProducts.slice(0, TRENDING_CONFIG.MAX_RANKS);
}

/**
 * 清除趋势缓存
 */
export async function clearTrendingCache(): Promise<void> {
  try {
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
 * 生成所有周期的趋势榜单并清除缓存
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

  await clearTrendingCache();

  logger.info(`Trending ranks generation completed: ${totalUpdatedCount} records updated`);

  return totalUpdatedCount;
}
