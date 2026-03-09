/**
 * Reddit 帖子亚马逊商品提取测试
 * 开启有头模式，测试从Reddit帖子中提取亚马逊商品
 */

import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../", envFile), override: true });

import { GoogleSearchCrawler } from "./crawlers/GoogleSearchCrawler";
import type { CategoryData } from "./types/crawler.types";

async function testRedditCrawler() {
  console.log("=== Reddit 帖子亚马逊商品提取测试 ===\n");

  // 测试类目
  const testCategories: CategoryData[] = [
    {
      id: "test-1",
      name: "headphones",
      slug: "headphones",
      searchKeywords: "headphones",
    },
  ];

  // 创建爬虫（有头模式）
  const crawler = new GoogleSearchCrawler(
    { headless: false, timeout: 60000 }, // 有头模式，方便观察
    {
      categoryConfig: {
        maxResultsPerCategory: 10, // 只处理前10个搜索结果
        maxProductsPerCategory: 5, // 每个类目最多提取5个商品
        searchDelayRange: [5000, 8000], // 5-8秒延迟
      },
    }
  );

  try {
    console.log("开始爬取商品...\n");

    const result = await crawler.crawlProductsByCategory(testCategories, new Date());

    console.log("\n=== 爬取结果 ===");
    console.log(`成功: ${result.success}`);
    console.log(`爬取到的商品数: ${result.data.length}`);
    console.log(`错误数: ${result.errors.length}`);
    console.log(`耗时: ${result.duration}ms`);

    if (result.data.length > 0) {
      console.log("\n=== 商品详情 ===");
      result.data.forEach((product, index) => {
        console.log(`\n[${index + 1}] ${product.name}`);
        console.log(`   ASIN: ${product.amazonId}`);
        console.log(`   价格: ${product.price || "N/A"} ${product.currency}`);
        console.log(`   描述: ${product.description?.substring(0, 100) || "N/A"}...`);
        console.log(`   链接: ${product.sourceUrl}`);
      });
    }

    if (result.errors.length > 0) {
      console.log("\n=== 错误信息 ===");
      result.errors.forEach((err, index) => {
        console.log(`[${index + 1}] ${err}`);
      });
    }

    console.log("\n=== 测试完成 ===");
  } catch (error) {
    console.error("测试失败:", error);
  }
  // 注意：浏览器会在爬虫执行完成后自动关闭
  console.log("\n测试脚本执行完毕");
}

testRedditCrawler();
