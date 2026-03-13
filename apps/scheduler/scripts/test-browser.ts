/**
 * 浏览器启动诊断脚本
 * 测试 Playwright 是否能正常启动浏览器
 */

import { chromium } from "playwright";

async function testBrowser() {
  console.log("=== 浏览器启动诊断测试 ===\n");

  try {
    console.log("1. 正在启动浏览器...");
    const browser = await chromium.launch({
      headless: false, // 有头模式便于观察
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
    console.log("✅ 浏览器启动成功");

    console.log("\n2. 正在创建 context...");
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    console.log("✅ Context 创建成功");

    console.log("\n3. 正在创建 page...");
    const page = await context.newPage();
    console.log("✅ Page 创建成功");

    console.log("\n4. 当前页面 URL:", page.url());

    console.log("\n5. 正在导航到 example.com...");
    await page.goto("https://example.com", { waitUntil: "networkidle", timeout: 30000 });
    console.log("✅ 导航成功");
    console.log("   当前 URL:", page.url());
    console.log("   页面标题:", await page.title());

    console.log("\n6. 等待 3 秒后关闭...");
    await new Promise((r) => setTimeout(r, 3000));

    await context.close();
    await browser.close();
    console.log("\n✅ 浏览器正常关闭");
    console.log("\n=== 诊断完成：浏览器可以正常工作 ===");
  } catch (error) {
    console.error("\n❌ 浏览器启动失败:");
    console.error(error);
    process.exit(1);
  }
}

testBrowser();
