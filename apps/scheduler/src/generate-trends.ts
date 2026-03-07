/**
 * 手动触发趋势数据生成
 * 直接执行，不依赖 BullMQ 队列
 */
import { db, products, trends, productHistories } from "@good-trending/database";
import { eq, desc, and } from "drizzle-orm";
import { count } from "drizzle-orm";

/**
 * 计算商品的趋势分数
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
 */
async function generateTrends(): Promise<void> {
  console.log("🚀 开始生成趋势数据...\n");

  // 1. 检查商品数量
  const productCountResult = await db.select({ value: count() }).from(products);
  const totalProducts = Number(productCountResult[0]?.value || 0);
  console.log(`📦 数据库中的商品数量: ${totalProducts}`);

  if (totalProducts === 0) {
    console.log("❌ 没有商品数据，无法生成趋势");
    return;
  }

  // 2. 获取所有商品
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      createdAt: products.createdAt,
      sourceType: products.sourceType,
    })
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(1000);

  console.log(`📝 将处理 ${allProducts.length} 个商品\n`);

  const today = new Date().toISOString().split("T")[0];
  let successCount = 0;
  let errorCount = 0;

  // 3. 处理每个商品
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

      successCount++;

      // 每 50 个商品显示一次进度
      if ((i + 1) % 50 === 0) {
        console.log(`⏳ 已处理 ${i + 1}/${allProducts.length} 个商品`);
      }
    } catch (error) {
      errorCount++;
      console.error(
        `❌ 处理商品 ${product.id} 失败:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log(`\n✅ 趋势数据生成完成!`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败: ${errorCount}`);

  // 4. 显示生成的趋势数据
  const trendCountResult = await db.select({ value: count() }).from(trends);
  console.log(`\n📊 趋势记录总数: ${trendCountResult[0]?.value || 0}`);

  // 5. 显示今天的数据
  const todayCountResult = await db
    .select({ value: count() })
    .from(trends)
    .where(eq(trends.date, today));
  console.log(`📅 今天 (${today}) 的趋势记录数: ${todayCountResult[0]?.value || 0}`);

  // 6. 显示前 10 名
  const topTrends = await db
    .select({
      productId: trends.productId,
      score: trends.score,
      rank: trends.rank,
    })
    .from(trends)
    .where(eq(trends.date, today))
    .orderBy(desc(trends.score))
    .limit(10);

  console.log("\n🏆 今日趋势 Top 10:");
  for (const trend of topTrends) {
    const product = allProducts.find((p) => p.id === trend.productId);
    console.log(`   #${trend.rank} [${trend.score}分] ${product?.name || "Unknown"}`);
  }
}

// 执行
generateTrends()
  .then(() => {
    console.log("\n🎉 完成!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 执行失败:", error);
    process.exit(1);
  });
