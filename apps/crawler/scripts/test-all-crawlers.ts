/**
 * 测试所有重构后的 Crawlee 爬虫
 */

import {
  createGoogleSearchCrawler,
  createRedditCrawler,
  createAmazonCrawler,
} from "../src/adapters/crawlee/index.js";

async function testGoogleSearch() {
  console.log("\n🔍 测试 GoogleSearchCrawler");
  console.log("=".repeat(60));

  const crawler = createGoogleSearchCrawler();

  try {
    const result = await crawler.search("site:reddit.com best headphones 2024");
    console.log("✅ 搜索完成");
    console.log(`   成功: ${result.success}`);
    console.log(`   结果数: ${result.totalResults}`);

    if (result.links.length > 0) {
      console.log(`   第一条: ${result.links[0].title.substring(0, 50)}...`);
    }

    return result.success;
  } catch (error) {
    console.error("❌ 测试失败:", error);
    return false;
  } finally {
    await crawler.close();
  }
}

async function testReddit() {
  console.log("\n🔍 测试 RedditCrawler");
  console.log("=".repeat(60));

  const crawler = createRedditCrawler();
  // 使用之前成功的 Google 搜索结果中的 URL
  const testUrl =
    "https://www.reddit.com/r/headphones/comments/1fecifp/test_drive_review_of_many_2024_anc_headphones/";

  try {
    const post = await crawler.fetchPost(testUrl);

    if (post) {
      console.log("✅ 成功获取帖子");
      console.log(`   标题: ${post.title.substring(0, 50)}...`);
      console.log(`   作者: ${post.author || "N/A"}`);
      console.log(`   评论数: ${post.comments.length}`);
      return true;
    } else {
      console.log("⚠️ 未获取到帖子（可能被拦截）");
      return false;
    }
  } catch (error) {
    console.error("❌ 测试失败:", error);
    return false;
  } finally {
    await crawler.close();
  }
}

async function testAmazon() {
  console.log("\n🔍 测试 AmazonCrawler");
  console.log("=".repeat(60));

  const crawler = createAmazonCrawler({ delay: 3000 });

  try {
    const products = await crawler.searchByKeyword("headphones");

    console.log("✅ 搜索完成");
    console.log(`   商品数: ${products.length}`);

    if (products.length > 0) {
      console.log(`   第一个: ${products[0].name.substring(0, 50)}...`);
      console.log(`   ASIN: ${products[0].asin}`);
      console.log(`   价格: ${products[0].price} ${products[0].currency}`);
    }

    return products.length > 0;
  } catch (error) {
    console.error("❌ 测试失败:", error);
    return false;
  } finally {
    await crawler.close();
  }
}

async function main() {
  console.log("🚀 开始测试所有 Crawlee 爬虫");
  console.log("=".repeat(60));

  const results: { name: string; passed: boolean }[] = [];

  // 测试 Google
  results.push({
    name: "GoogleSearchCrawler",
    passed: await testGoogleSearch(),
  });

  // 测试 Reddit
  results.push({
    name: "RedditCrawler",
    passed: await testReddit(),
  });

  // 测试 Amazon
  results.push({
    name: "AmazonCrawler",
    passed: await testAmazon(),
  });

  // 汇总
  console.log("\n" + "=".repeat(60));
  console.log("📊 测试结果汇总");
  console.log("=".repeat(60));

  results.forEach((r) => {
    console.log(`${r.passed ? "✅" : "❌"} ${r.name}`);
  });

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n总计: ${passedCount}/${results.length} 通过`);

  process.exit(passedCount === results.length ? 0 : 1);
}

main().catch((error) => {
  console.error("测试运行失败:", error);
  process.exit(1);
});
