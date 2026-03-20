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
 * 计算商品趋势分数
 *
 * 公式：
 * ```
 * baseScore      = redditCount + xCount × 0.8
 * appearanceBonus = 1 + appearanceScore × 0.5   // 出现频率加成，最高 +50%
 * score          = baseScore × appearanceBonus
 * timeDecay      = max(0.5, 1 - daysSinceCreated / 60)  // 最低保留 50% 权重
 * finalScore     = max(0, score × timeDecay)
 * ```
 *
 * 参数说明：
 * - `appearanceScore`：由 `calculateAppearanceScore()` 返回的 0~1 频率值，
 *   代表该商品在对应时间窗口内出现的天数占比
 * - 时间衰减：商品超过 60 天后固定以 50% 权重计算，防止老商品被彻底压制
 *
 * @param redditCount - Reddit 提及次数
 * @param xCount - X 平台提及次数
 * @param createdAt - 商品入库时间（用于时间衰减）
 * @param appearanceScore - 出现频率得分 (0~1)，默认 0
 * @returns 最终趋势分数（非负浮点数）
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
 * 计算 TODAY 周期的趋势分数并写入榜单（每日凌晨 03:00 执行）
 *
 * 与 `updateTrendingData()` 的区别：
 * - 本函数只计算 **TODAY** 一个周期，专注"今日实时热度"
 * - `updateTrendingData()` 遍历所有 8 个周期，生成完整多维度榜单（04:00 执行）
 *
 * 流程：
 * 1. 查最近 30 天内入库的商品（作为候选池）
 * 2. 并行获取今日社交统计 + 各商品出现频率 Bitmap
 * 3. 对每个商品调用 `calculateTrendingScore()` 计算分数
 * 4. 降序排列后全量写入 `trend_ranks`（先 DELETE 当日 TODAY 数据，再 INSERT）
 *
 * @returns 写入 `trend_ranks` 的商品数量
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
