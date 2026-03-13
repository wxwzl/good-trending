/**
 * Google Search Crawlee 单独测试
 */

import { createGoogleSearchCrawler } from "../src/adapters/crawlee/index.js";

async function testGoogleCrawlee() {
  console.log("🔍 测试 Google Search Crawlee 实现");
  console.log();

  const crawler = createGoogleSearchCrawler();

  try {
    const query = "site:reddit.com best headphones 2024";
    console.log("搜索:", query);
    console.log("开始爬取... (可能需要 30-60 秒)");
    console.log();

    const result = await crawler.search(query);

    console.log();
    console.log("=".repeat(60));
    console.log("搜索完成:", result.success ? "✅ 成功" : "❌ 失败");
    console.log("结果数量:", result.totalResults);
    console.log("数据来源:", result.source);
    console.log("=".repeat(60));

    if (result.links.length > 0) {
      console.log("\n前 5 个结果:");
      result.links.slice(0, 5).forEach((link, i) => {
        console.log(`\n${i + 1}. ${link.title}`);
        console.log(`   URL: ${link.url}`);
      });
    }

    return result.success;
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    return false;
  } finally {
    await crawler.close();
  }
}

testGoogleCrawlee().then((success) => {
  process.exit(success ? 0 : 1);
});
