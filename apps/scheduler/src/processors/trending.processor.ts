/**
 * 趋势任务处理器
 * 处理趋势数据更新任务 - 使用新的表结构 (productSocialStats, trendRanks)
 */
import { Worker, Job } from "bullmq";
import { createSchedulerLogger } from "../utils/logger";
import { TrendingJobData, TrendingJobResult, QUEUE_NAMES } from "../queue";
import { redisConnectionOptions } from "../queue/redis";

const logger = createSchedulerLogger("trending-processor");

/**
 * 趋势处理器实例
 */
let trendingWorker: Worker<TrendingJobData, TrendingJobResult> | null = null;

/**
 * 周期类型定义
 */
const PERIOD_TYPES = [
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "LAST_7_DAYS",
  "LAST_15_DAYS",
  "LAST_30_DAYS",
  "LAST_60_DAYS",
] as const;

type PeriodType = (typeof PERIOD_TYPES)[number];

/**
 * 计算商品的趋势分数
 *
 * @description
 * 基于社交提及数据计算综合热门度分数：
 * 1. Reddit 提及数（权重 1.0）
 * 2. X 平台提及数（权重 0.8）
 * 3. 时间衰减：越新的商品分数越高
 *
 * @param redditCount - Reddit 提及数
 * @param xCount - X 平台提及数
 * @param createdAt - 商品创建时间
 * @returns 趋势分数
 */
function calculateTrendingScore(redditCount: number, xCount: number, createdAt: Date): number {
  // 基础分数：Reddit 提及数 + X 提及数 * 权重
  let score = redditCount + xCount * 0.8;

  // 时间衰减因子：越新的商品权重越高
  const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const timeDecay = Math.max(0.5, 1 - daysSinceCreated / 60); // 60 天内衰减，最低 0.5
  score = score * timeDecay;

  // 确保分数非负
  return Math.max(0, score);
}

/**
 * 根据周期获取对应的字段值
 */
function getSocialCountsByPeriod(
  period: PeriodType,
  stat: {
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
 * 生成所有周期的趋势榜单
 * 基于 productSocialStats 表的数据生成趋势排名
 *
 * @returns 更新的记录数
 */
async function updateTrendingData(): Promise<number> {
  const { db, products, productSocialStats, trendRanks } = await import("@good-trending/database");
  const { eq, and } = await import("drizzle-orm");
  const { createId } = await import("@paralleldrive/cuid2");

  logger.info("Starting trending ranks generation...");

  const today = new Date().toISOString().split("T")[0];
  let totalUpdatedCount = 0;

  // 为每个周期生成榜单
  for (const period of PERIOD_TYPES) {
    try {
      logger.info(`Generating trend ranks for period: ${period}`);

      // 获取今天的社交统计数据
      const socialStats = await db
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
        .where(eq(productSocialStats.statDate, today));

      // 获取商品创建时间
      const productIds = socialStats.map((s) => s.productId);
      if (productIds.length === 0) {
        logger.info(`No social stats found for period ${period}`);
        continue;
      }

      const productData = await db
        .select({
          id: products.id,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(eq(products.id, productIds[0])); // Drizzle 需要单独处理 IN 查询

      const productCreateTimeMap = new Map(productData.map((p) => [p.id, p.createdAt]));

      // 计算趋势分数并排序
      const rankedProducts = socialStats
        .map((stat) => {
          const { redditCount, xCount } = getSocialCountsByPeriod(period, stat);
          const createdAt = productCreateTimeMap.get(stat.productId) || new Date();
          const score = calculateTrendingScore(redditCount, xCount, createdAt);

          return {
            productId: stat.productId,
            score,
            redditMentions: redditCount,
            xMentions: xCount,
          };
        })
        .sort((a, b) => b.score - a.score);

      // 批量保存榜单（前 2000 名）
      const topProducts = rankedProducts.slice(0, 2000);

      if (topProducts.length > 0) {
        // 先删除该周期旧数据
        await db
          .delete(trendRanks)
          .where(and(eq(trendRanks.periodType, period), eq(trendRanks.statDate, today)));

        // 批量插入新数据
        const insertData = topProducts.map((product, index) => ({
          id: createId(),
          productId: product.productId,
          periodType: period,
          statDate: today,
          rank: index + 1,
          score: product.score,
          redditMentions: product.redditMentions,
          xMentions: product.xMentions,
          sourceData: { calculationMethod: "reddit + x*0.8" },
        }));

        // 分批插入，每批 500 条
        const batchSize = 500;
        for (let i = 0; i < insertData.length; i += batchSize) {
          const batch = insertData.slice(i, i + batchSize);
          await db.insert(trendRanks).values(batch);
        }

        totalUpdatedCount += topProducts.length;
        logger.info(`Generated ${topProducts.length} ranks for period ${period}`);
      }
    } catch (error) {
      logger.error(`Failed to generate trend ranks for period ${period}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 清除趋势缓存
  try {
    const redisModule = await import("@good-trending/database");
    const redis = redisModule.getRedisClient();
    const keys = await redis.keys("trending:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    logger.info("Cleared trending cache");
  } catch (error) {
    logger.warn("Failed to clear trending cache", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info(`Trending ranks generation completed: ${totalUpdatedCount} records updated`);

  return totalUpdatedCount;
}

/**
 * 计算今日趋势分数
 * 基于今天的社交提及数据计算趋势分数
 *
 * @returns 计算的商品数量
 */
async function calculateAllTrendingScores(): Promise<number> {
  const { db, products, productSocialStats, trendRanks } = await import("@good-trending/database");
  const { eq, desc, and, gte } = await import("drizzle-orm");
  const { createId } = await import("@paralleldrive/cuid2");

  logger.info("Starting TODAY trending score calculation...");

  const today = new Date().toISOString().split("T")[0];

  // 获取最近 30 天的商品
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentProducts = await db
    .select({
      id: products.id,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(gte(products.createdAt, thirtyDaysAgo));

  logger.info(`Found ${recentProducts.length} recent products to calculate`);

  // 获取今天的社交统计数据
  const socialStats = await db
    .select({
      productId: productSocialStats.productId,
      todayRedditCount: productSocialStats.todayRedditCount,
      todayXCount: productSocialStats.todayXCount,
    })
    .from(productSocialStats)
    .where(eq(productSocialStats.statDate, today));

  const socialStatsMap = new Map(socialStats.map((s) => [s.productId, s]));

  // 计算每个商品的分数
  const scoredProducts = recentProducts.map((product) => {
    const stat = socialStatsMap.get(product.id);
    const redditCount = stat?.todayRedditCount || 0;
    const xCount = stat?.todayXCount || 0;
    const score = calculateTrendingScore(redditCount, xCount, product.createdAt);

    return {
      productId: product.id,
      score,
      redditMentions: redditCount,
      xMentions: xCount,
    };
  });

  // 按分数排序
  const rankedProducts = scoredProducts.sort((a, b) => b.score - a.score);

  let calculatedCount = 0;

  try {
    // 先删除今天的旧数据
    await db
      .delete(trendRanks)
      .where(and(eq(trendRanks.periodType, "TODAY"), eq(trendRanks.statDate, today)));

    // 批量插入新数据
    const insertData = rankedProducts.map((product, index) => ({
      id: createId(),
      productId: product.productId,
      periodType: "TODAY",
      statDate: today,
      rank: index + 1,
      score: product.score,
      redditMentions: product.redditMentions,
      xMentions: product.xMentions,
      sourceData: { calculationMethod: "reddit + x*0.8" },
    }));

    // 分批插入
    const batchSize = 500;
    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      await db.insert(trendRanks).values(batch);
      calculatedCount += batch.length;
    }

    logger.info(`TODAY trend ranks calculation completed: ${calculatedCount} products processed`);
  } catch (error) {
    logger.error(`Failed to calculate trend ranks`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return calculatedCount;
}

/**
 * 处理趋势任务
 *
 * @param job - BullMQ 任务对象
 * @returns 任务结果
 */
async function processTrendingJob(job: Job<TrendingJobData>): Promise<TrendingJobResult> {
  const { data } = job;
  const startTime = Date.now();

  logger.info(`Processing trending job`, {
    jobId: job.id,
    type: data.type,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: TrendingJobResult = {
    updatedCount: 0,
    calculatedCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    if (data.type === "update") {
      result.updatedCount = await updateTrendingData();
    } else if (data.type === "calculate") {
      result.calculatedCount = await calculateAllTrendingScores();
    }

    const endTime = Date.now();
    result.duration = endTime - startTime;
    result.completedAt = new Date().toISOString();

    logger.info(`Trending job completed`, {
      jobId: job.id,
      type: data.type,
      updatedCount: result.updatedCount,
      calculatedCount: result.calculatedCount,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Trending job failed`, {
      jobId: job.id,
      type: data.type,
      error: errorMessage,
      stack: errorStack,
    });

    throw error;
  }
}

/**
 * 创建趋势处理器
 *
 * @param concurrency - 并发数
 * @returns Worker 实例
 */
export function createTrendingProcessor(
  concurrency: number = 1
): Worker<TrendingJobData, TrendingJobResult> {
  if (trendingWorker) {
    return trendingWorker;
  }

  trendingWorker = new Worker<TrendingJobData, TrendingJobResult>(
    QUEUE_NAMES.TRENDING,
    processTrendingJob,
    {
      connection: redisConnectionOptions,
      concurrency,
    }
  );

  // 事件监听
  trendingWorker.on("completed", (job, result) => {
    logger.info(`Job ${job.id} completed successfully`, {
      type: job.data.type,
      updatedCount: result.updatedCount,
      calculatedCount: result.calculatedCount,
    });
  });

  trendingWorker.on("failed", (job, error) => {
    logger.error(`Job ${job?.id} failed`, {
      error: error.message,
      stack: error.stack,
    });
  });

  trendingWorker.on("error", (error) => {
    logger.error(`Worker error`, {
      error: error.message,
      stack: error.stack,
    });
  });

  logger.info(`Trending processor started with concurrency: ${concurrency}`);

  return trendingWorker;
}

/**
 * 关闭趋势处理器
 */
export async function closeTrendingProcessor(): Promise<void> {
  if (trendingWorker) {
    await trendingWorker.close();
    trendingWorker = null;
    logger.info("Trending processor closed");
  }
}
