/**
 * SerpAPI 搜索测试脚本
 * 测试 SerpAPI 和浏览器回退逻辑
 */

import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../", envFile), override: true });

import { GoogleSearchService } from "./adapters/legacy/google/index.js";

async function testSerpApi() {
  console.log("=== SerpAPI 搜索测试 ===\n");

  // 检查是否有 API key
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.log("⚠️ 未设置 SERPAPI_KEY 环境变量，将使用浏览器模式");
    console.log("要获取 API key，请访问: https://serpapi.com/\n");
  } else {
    console.log(`✅ 找到 SERPAPI_KEY: ${apiKey.substring(0, 10)}...\n`);
  }

  // 创建搜索服务
  const searchService = new GoogleSearchService({
    serpApi: {
      apiKey: apiKey || "",
      engine: "google",
    },
    browser: {
      headless: false, // 有头模式，方便观察
      timeout: 60000,
    },
    // forceBrowser: true, // 强制使用浏览器（测试用）
  });

  // 测试搜索
  const testQueries = [
    "site:reddit.com headphones after:2024-01-01",
    "site:reddit.com electronics deals",
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 测试搜索: ${query}`);
    console.log("-".repeat(60));

    try {
      const result = await searchService.search(query);

      console.log(`✅ 搜索成功!`);
      console.log(`   来源: ${result.source}`);
      console.log(`   总结果数: ${result.totalResults}`);
      console.log(`   返回链接数: ${result.links.length}`);

      // 打印前5个结果
      if (result.links.length > 0) {
        console.log(`\n   前5个结果:`);
        result.links.slice(0, 5).forEach((link, index) => {
          console.log(`   [${index + 1}] ${link.title.substring(0, 60)}...`);
          console.log(`       URL: ${link.url.substring(0, 70)}...`);
        });
      }

      if (result.error) {
        console.log(`\n   ⚠️ 警告: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ 搜索失败:`, error);
    }

    // 延迟一下再搜索下一个
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 关闭浏览器（如果使用了浏览器模式）
  await searchService.close();

  console.log("\n=== 测试完成 ===");
}

testSerpApi();
