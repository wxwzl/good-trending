/**
 * 种子数据脚本
 * 用于开发和测试环境初始化数据
 */

// 必须在最开始加载环境变量，在其他 import 之前
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../../.env") });

// 现在可以安全地导入依赖数据库连接的模块
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  products,
  topics,
  tags,
  trends,
  productTopics,
  productTags,
  productHistories,
} from "./schema";
import { createId } from "@paralleldrive/cuid2";

// 创建数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, {
  schema: { products, topics, tags, trends, productTopics, productTags, productHistories },
});

async function seed() {
  console.log("🌱 开始种子数据...");

  try {
    // 0. 清理现有数据
    console.log("🧹 清理现有数据...");
    await db.delete(productHistories);
    await db.delete(trends);
    await db.delete(productTags);
    await db.delete(productTopics);
    await db.delete(products);
    await db.delete(tags);
    await db.delete(topics);
    console.log("✅ 数据清理完成");

    // 1. 创建分类 (Topics)
    console.log("📦 创建分类...");
    const insertedTopics = await db
      .insert(topics)
      .values([
        {
          id: createId(),
          name: "电子产品",
          slug: "electronics",
          description: "最新的电子产品和数码设备",
          imageUrl: "https://picsum.photos/seed/electronics/400/300",
        },
        {
          id: createId(),
          name: "家居生活",
          slug: "home-living",
          description: "家居用品和生活好物",
          imageUrl: "https://picsum.photos/seed/home/400/300",
        },
        {
          id: createId(),
          name: "时尚穿搭",
          slug: "fashion",
          description: "潮流时尚和穿搭推荐",
          imageUrl: "https://picsum.photos/seed/fashion/400/300",
        },
        {
          id: createId(),
          name: "美妆护肤",
          slug: "beauty",
          description: "美妆产品和护肤推荐",
          imageUrl: "https://picsum.photos/seed/beauty/400/300",
        },
        {
          id: createId(),
          name: "运动户外",
          slug: "sports",
          description: "运动装备和户外用品",
          imageUrl: "https://picsum.photos/seed/sports/400/300",
        },
      ])
      .returning();
    console.log(`✅ 创建了 ${insertedTopics.length} 个分类`);

    // 2. 创建标签 (Tags)
    console.log("🏷️ 创建标签...");
    const insertedTags = await db
      .insert(tags)
      .values([
        { id: createId(), name: "热卖", slug: "bestseller" },
        { id: createId(), name: "新品", slug: "new-arrival" },
        { id: createId(), name: "折扣", slug: "discount" },
        { id: createId(), name: "限量", slug: "limited" },
        { id: createId(), name: "网红推荐", slug: "viral" },
      ])
      .returning();
    console.log(`✅ 创建了 ${insertedTags.length} 个标签`);

    // 3. 创建商品 (Products)
    console.log("🛍️ 创建商品...");
    const productData = [
      {
        name: "Apple AirPods Pro 2",
        description: "主动降噪无线蓝牙耳机，MagSafe充电盒",
        image: "https://picsum.photos/seed/airpods/400/400",
        price: "249.00",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B0BDHWDRSM",
        sourceId: "B0BDHWDRSM",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Sony WH-1000XM5 无线降噪耳机",
        description: "业界领先降噪技术，30小时续航",
        image: "https://picsum.photos/seed/sony/400/400",
        price: "349.99",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B09XS7JWHH",
        sourceId: "B09XS7JWHH",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Dyson V15 Detect 无线吸尘器",
        description: "激光探测灰尘，智能显示屏",
        image: "https://picsum.photos/seed/dyson/400/400",
        price: "749.99",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B08R5ZLXQF",
        sourceId: "B08R5ZLXQF",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Stanley Quencher 保温杯 40oz",
        description: "网红保温杯，保持冰镇40小时",
        image: "https://picsum.photos/seed/stanley/400/400",
        price: "45.00",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B0BQXM9VLK",
        sourceId: "B0BQXM9VLK",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Lululemon Align 高腰紧身裤",
        description: "网红瑜伽裤，裸感面料",
        image: "https://picsum.photos/seed/lululemon/400/400",
        price: "98.00",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B00ZRHJPIU",
        sourceId: "B00ZRHJPIU",
        sourceType: "AMAZON" as const,
      },
      {
        name: "iPhone 15 Pro Max",
        description: "钛金属设计，A17 Pro芯片",
        image: "https://picsum.photos/seed/iphone/400/400",
        price: "1199.00",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B0CHX2F5QT",
        sourceId: "B0CHX2F5QT",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Samsung Galaxy S24 Ultra",
        description: "AI智能手机，S Pen手写笔",
        image: "https://picsum.photos/seed/samsung/400/400",
        price: "1299.99",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B0CR5J6RVT",
        sourceId: "B0CR5J6RVT",
        sourceType: "AMAZON" as const,
      },
      {
        name: "Nintendo Switch OLED",
        description: "7英寸OLED屏幕，64GB存储",
        image: "https://picsum.photos/seed/switch/400/400",
        price: "349.99",
        currency: "USD",
        sourceUrl: "https://amazon.com/dp/B098RKWHHZ",
        sourceId: "B098RKWHHZ",
        sourceType: "AMAZON" as const,
      },
    ];

    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log(`✅ 创建了 ${insertedProducts.length} 个商品`);

    // 4. 关联商品和分类
    console.log("🔗 关联商品和分类...");
    const productTopicRelations = insertedProducts.flatMap((product, index) => {
      const relations = [];
      // 每个商品分配1-2个分类
      const topicIndices = [index % insertedTopics.length];
      if (index % 2 === 0) {
        topicIndices.push((index + 1) % insertedTopics.length);
      }
      for (const topicIdx of topicIndices) {
        relations.push({
          productId: product.id,
          topicId: insertedTopics[topicIdx].id,
        });
      }
      return relations;
    });
    await db.insert(productTopics).values(productTopicRelations);
    console.log(`✅ 创建了 ${productTopicRelations.length} 个商品-分类关联`);

    // 5. 关联商品和标签
    console.log("🏷️ 关联商品和标签...");
    const productTagRelations = insertedProducts.flatMap((product, index) => {
      const relations = [];
      // 每个商品分配1-2个标签
      const tagIndices = [index % insertedTags.length];
      if (index % 3 === 0) {
        tagIndices.push((index + 2) % insertedTags.length);
      }
      for (const tagIdx of tagIndices) {
        relations.push({
          productId: product.id,
          tagId: insertedTags[tagIdx].id,
        });
      }
      return relations;
    });
    await db.insert(productTags).values(productTagRelations);
    console.log(`✅ 创建了 ${productTagRelations.length} 个商品-标签关联`);

    // 6. 创建趋势数据
    console.log("📈 创建趋势数据...");
    const today = new Date();
    const trendData = insertedProducts.flatMap((product, index) => {
      // 为每个商品创建过去7天的趋势数据
      return Array.from({ length: 7 }, (_, dayOffset) => {
        const date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        const baseScore = 100 - index * 10 + Math.random() * 20;
        return {
          id: createId(),
          productId: product.id,
          date: date.toISOString().split("T")[0],
          rank: index + 1 + Math.floor(Math.random() * 3),
          score: Math.round(baseScore * 100) / 100,
          mentions: Math.floor(Math.random() * 1000) + 100,
          views: Math.floor(Math.random() * 10000) + 1000,
          likes: Math.floor(Math.random() * 5000) + 500,
        };
      });
    });
    await db.insert(trends).values(trendData);
    console.log(`✅ 创建了 ${trendData.length} 条趋势数据`);

    // 7. 创建历史数据
    console.log("📊 创建历史数据...");
    const historyData = insertedProducts.map((product, index) => ({
      id: createId(),
      productId: product.id,
      date: today.toISOString().split("T")[0],
      price: product.price,
      rank: index + 1,
      salesCount: Math.floor(Math.random() * 1000) + 100,
      reviewCount: Math.floor(Math.random() * 500) + 50,
      rating: 4 + Math.random() * 1,
    }));
    await db.insert(productHistories).values(historyData);
    console.log(`✅ 创建了 ${historyData.length} 条历史数据`);

    console.log("\n🎉 种子数据创建完成！");
    console.log("=====================================");
    console.log(`分类: ${insertedTopics.length}`);
    console.log(`标签: ${insertedTags.length}`);
    console.log(`商品: ${insertedProducts.length}`);
    console.log(`趋势记录: ${trendData.length}`);
    console.log(`历史记录: ${historyData.length}`);
  } catch (error) {
    console.error("❌ 种子数据创建失败:", error);
    throw error;
  }

  process.exit(0);
}

seed();
