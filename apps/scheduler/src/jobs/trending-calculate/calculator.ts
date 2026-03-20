/**
 * 趋势分数计算器
 * 从 processors/trending/calculator.ts 迁移而来
 * 负责 calculateAllTrendingScores 逻辑
 */
import { formatDate } from "@good-trending/shared";
import { createSchedulerLogger } from "../../utils/logger.js";
import {
  getTodaySocialStats,
  getRecentProducts,
  getProductAppearanceStats,
  calculateAppearanceScore,
} from "../../utils/database-queries.js";
import { db, trendRanks } from "@good-trending/database";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { TRENDING_CONFIG } from "../../constants/index.js";
import type { PeriodType } from "../../types/index.js";

const logger = createSchedulerLogger("trending-calculate");

/**
 * 社交统计数据接口
 */
interface SocialStats {
  productId: string;
  todayRedditCount: number;
  todayXCount: number;
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
 * 计算趋势分数
 *
 * 基于社交提及数据和出现频率计算综合热门度分数：
 * 1. Reddit 提及数（权重 1.0）
 * 2. X 平台提及数（权重 0.8）
 * 3. 出现频率加成（最高 50%）
 * 4. 时间衰减（越新的商品权重越高）
 */
export function calculateTrendingScore(
  redditCount: number,
  xCount: number,
  createdAt: Date,
  appearanceScore: number = 0
): number {
  const baseScore = redditCount + xCount * TRENDING_CONFIG.X_MENTION_WEIGHT;
  const appearanceBonus = 1 + appearanceScore * 0.5;
  let score = baseScore * appearanceBonus;

  const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const timeDecay = Math.max(
    TRENDING_CONFIG.TIME_DECAY_MIN_FACTOR,
    1 - daysSinceCreated / TRENDING_CONFIG.TIME_DECAY_MAX_DAYS
  );
  score = score * timeDecay;

  return Math.max(0, score);
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

  return rankedProducts.length;
}

/**
 * 计算今日趋势分数并生成榜单
 *
 * @returns 计算的商品数量
 */
export async function calculateAllTrendingScores(): Promise<number> {
  logger.info("Starting TODAY trending score calculation...");

  const today = formatDate(new Date());

  const recentProducts = await getRecentProducts(30);
  logger.info(`Found ${recentProducts.length} recent products to calculate`);

  const [socialStats, appearanceStatsMap] = await Promise.all([
    getTodaySocialStats(today),
    getProductAppearanceStats(recentProducts.map((p) => p.id)),
  ]);
  const socialStatsMap = new Map(socialStats.map((s) => [s.productId, s as SocialStats]));

  const scoredProducts = recentProducts.map((product) => {
    const stat = socialStatsMap.get(product.id);
    const redditCount = stat?.todayRedditCount || 0;
    const xCount = stat?.todayXCount || 0;

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

  const rankedProducts = scoredProducts.sort((a, b) => b.score - a.score);
  const savedCount = await saveTrendRanks("TODAY", today, rankedProducts);

  logger.info(`TODAY trend ranks calculation completed: ${savedCount} products processed`);

  return savedCount;
}
