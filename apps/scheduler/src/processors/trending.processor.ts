/**
 * 趋势任务处理器
 * 处理趋势数据更新任务
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
 * 计算商品的趋势分数
 *
 * @description
 * 基于多个因素计算综合热门度分数：
 * 1. 时间衰减：越近的数据权重越高
 * 2. 商品历史数据：价格变化、销量等
 * 3. 随机因素：用于打散相同分数的商品
 *
 * @param product - 商品数据
 * @param historyData - 历史数据
 * @returns 0-100 的热门度分数
 */
function calculateTrendingScore(
  product: {
    id: string;
    createdAt: Date;
    sourceType: string;
  },
  historyData: {
    price?: string | null;
    rank?: number | null;
    salesCount?: number | null;
    reviewCount?: number | null;
    rating?: number | null;
  }[]
): number {
  // 基础分数
  let score = 50;

  // 时间衰减：越新的商品分数越高
  const daysSinceCreated = Math.floor(
    (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeDecay = Math.max(0, 1 - daysSinceCreated / 30); // 30 天内衰减
  score += timeDecay * 20; // 最多加 20 分

  // 历史数据加权
  if (historyData.length > 0) {
    const latestHistory = historyData[0];

    // 排名因素：排名越靠前分数越高
    if (latestHistory.rank !== null && latestHistory.rank !== undefined) {
      const rankBonus = Math.max(0, (100 - latestHistory.rank) / 10);
      score += rankBonus;
    }

    // 评分因素
    if (latestHistory.rating !== null && latestHistory.rating !== undefined) {
      const ratingBonus = (latestHistory.rating / 5) * 10;
      score += ratingBonus;
    }

    // 评论数因素
    if (latestHistory.reviewCount !== null && latestHistory.reviewCount !== undefined) {
      const reviewBonus = Math.min(latestHistory.reviewCount / 100, 10);
      score += reviewBonus;
    }

    // 销量因素
    if (latestHistory.salesCount !== null && latestHistory.salesCount !== undefined) {
      const salesBonus = Math.min(latestHistory.salesCount / 1000, 10);
      score += salesBonus;
    }
  }

  // 来源类型加权：X 平台的内容通常更有时效性
  if (product.sourceType === "X_PLATFORM") {
    score += 5;
  }

  // 确保分数在 0-100 范围内
  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * 更新趋势数据
 *
 * @returns 更新的记录数
 */
async function updateTrendingData(): Promise<number> {
  const { db, products, trends, productHistories } = await import("@good-trending/database");
  const { eq, desc, and } = await import("drizzle-orm");

  logger.info("Starting trending data update...");

  // 获取所有商品
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      createdAt: products.createdAt,
      sourceType: products.sourceType,
    })
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(1000); // 限制处理数量

  logger.info(`Found ${allProducts.length} products to process`);

  const today = new Date().toISOString().split("T")[0];
  let updatedCount = 0;

  // 批量处理商品
  for (let i = 0; i < allProducts.length; i++) {
    const product = allProducts[i];

    try {
      // 获取商品历史数据
      const historyData = await db
        .select()
        .from(productHistories)
        .where(eq(productHistories.productId, product.id))
        .orderBy(desc(productHistories.date))
        .limit(30);

      // 计算趋势分数
      const score = calculateTrendingScore(product, historyData);

      // 检查今天是否已有趋势记录
      const existingTrend = await db
        .select()
        .from(trends)
        .where(and(eq(trends.productId, product.id), eq(trends.date, today)))
        .limit(1);

      if (existingTrend.length > 0) {
        // 更新现有记录
        await db
          .update(trends)
          .set({
            score,
            rank: i + 1,
          })
          .where(eq(trends.id, existingTrend[0].id));
      } else {
        // 创建新记录
        await db.insert(trends).values({
          productId: product.id,
          date: today,
          rank: i + 1,
          score,
          mentions: 0,
          views: 0,
          likes: 0,
        });
      }

      updatedCount++;
    } catch (error) {
      logger.error(`Failed to update trending for product ${product.id}`, {
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

  logger.info(`Trending data update completed: ${updatedCount} records updated`);

  return updatedCount;
}

/**
 * 计算所有商品的趋势分数
 *
 * @returns 计算的商品数量
 */
async function calculateAllTrendingScores(): Promise<number> {
  const { db, products, trends, productHistories } = await import("@good-trending/database");
  const { eq, desc, and, gte } = await import("drizzle-orm");

  logger.info("Starting trending score calculation...");

  // 获取最近 30 天的商品
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentProducts = await db
    .select({
      id: products.id,
      createdAt: products.createdAt,
      sourceType: products.sourceType,
    })
    .from(products)
    .where(gte(products.createdAt, thirtyDaysAgo));

  logger.info(`Found ${recentProducts.length} recent products to calculate`);

  let calculatedCount = 0;

  for (const product of recentProducts) {
    try {
      // 获取商品历史数据
      const historyData = await db
        .select()
        .from(productHistories)
        .where(eq(productHistories.productId, product.id))
        .orderBy(desc(productHistories.date))
        .limit(30);

      // 计算趋势分数
      const score = calculateTrendingScore(product, historyData);

      // 更新或创建今天的趋势记录
      const today = new Date().toISOString().split("T")[0];
      const existingTrend = await db
        .select()
        .from(trends)
        .where(and(eq(trends.productId, product.id), eq(trends.date, today)))
        .limit(1);

      if (existingTrend.length > 0) {
        await db.update(trends).set({ score }).where(eq(trends.id, existingTrend[0].id));
      } else {
        await db.insert(trends).values({
          productId: product.id,
          date: today,
          rank: 0, // 排名在 updateTrendingData 中计算
          score,
          mentions: 0,
          views: 0,
          likes: 0,
        });
      }

      calculatedCount++;
    } catch (error) {
      logger.error(`Failed to calculate score for product ${product.id}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info(`Trending score calculation completed: ${calculatedCount} products processed`);

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
