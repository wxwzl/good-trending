/**
 * Google 搜索服务快速测试脚本
 *
 * 用法:
 *   pnpm tsx scripts/quick-test-google.ts [搜索关键词]
 *
 * 示例:
 *   pnpm tsx scripts/quick-test-google.ts
 *   pnpm tsx scripts/quick-test-google.ts "best headphones 2024"
 */

import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../../.env.development"), override: true });

import { GoogleSearchService } from "../src/services/google-search-service";

async function main() {
  const query = process.argv[2] || "site:reddit.com best electronics 2024";

  console.log("🚀 Google 搜索快速测试\n");
  console.log(`🔍 搜索: "${query}"\n`);

  const service = new GoogleSearchService({
    serpApi: {
      apiKey: process.env.SERPAPI_KEY || "",
      engine: "google",
    },
    browser: {
      headless: false, // 有头模式，方便观察
      timeout: 60000,
    },
  });

  try {
    console.log("⏳ 搜索中...\n");
    const startTime = Date.now();

    const result = await service.search(query);

    const duration = Date.now() - startTime;

    console.log("✅ 搜索完成!\n");
    console.log("📊 结果统计:");
    console.log(`   成功: ${result.success}`);
    console.log(`   来源: ${result.source}`);
    console.log(`   总结果数: ${result.totalResults.toLocaleString()}`);
    console.log(`   返回链接数: ${result.links.length}`);
    console.log(`   耗时: ${duration}ms\n`);

    if (result.links.length > 0) {
      console.log("🔗 搜索结果:");
      result.links.slice(0, 5).forEach((link, i) => {
        console.log(`\n   ${i + 1}. ${link.title}`);
        console.log(`      ${link.url}`);
        if (link.snippet) {
          console.log(`      ${link.snippet.substring(0, 100)}...`);
        }
      });
    }

    if (result.error) {
      console.log(`\n⚠️  错误: ${result.error}`);
    }
  } catch (error) {
    console.error("\n❌ 搜索失败:", error);
  } finally {
    await service.close();
    console.log("\n✨ 测试结束");
  }
}

main();
