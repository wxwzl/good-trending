/**
 * Backfill 浏览器测试脚本
 * 测试浏览器是否能正常工作
 */

// 先加载环境变量

const { loadEnv } = require("./loadEnv.js");
loadEnv({ command: "test", silent: true });

import { chromium } from "playwright";

async function testBackfillBrowser() {
  console.log("=== Backfill 浏览器测试 ===\n");

  try {
    // 动态导入 crawler 服务
    const { GoogleSearchService } = await import("@good-trending/crawler");

    console.log("1. 启动浏览器...");
    const browser = await chromium.launch({
      headless: false,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });
    console.log("✅ 浏览器启动成功\n");

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();
    console.log("✅ 页面创建成功");
    console.log(`   当前 URL: ${page.url()}\n`);

    console.log("2. 创建 GoogleSearchService...");
    const googleSearch = new GoogleSearchService({ forceBrowser: true });
    console.log("✅ GoogleSearchService 创建成功\n");

    console.log("3. 执行搜索测试...");
    const query = "test query";
    console.log(`   查询: "${query}"`);
    console.log("   使用外部 page 实例...\n");

    const result = await googleSearch.search(query, page);

    console.log("\n✅ 搜索完成");
    console.log(`   成功: ${result.success}`);
    console.log(`   来源: ${result.source}`);
    console.log(`   结果数: ${result.links.length}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }

    console.log("\n4. 关闭浏览器...");
    await context.close();
    await browser.close();
    await googleSearch.close();
    console.log("✅ 浏览器已关闭");

    console.log("\n=== 测试完成 ===");
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    process.exit(1);
  }
}

testBackfillBrowser();
