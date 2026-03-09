/**
 * Google 搜索测试脚本
 * 开启有头模式，测试搜索结果提取
 */

import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const env = process.env.NODE_ENV || "development";
const envFile = env === "production" ? ".env" : `.env.${env}`;
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../../", envFile), override: true });

import { chromium } from "playwright";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * 构建搜索查询
 */
function buildSearchQuery(keyword: string, afterDate: string): string {
  return `site:reddit.com "${keyword}" after:${afterDate}`;
}

/**
 * 从 URL 提取 ASIN
 */
function extractAsinFromUrl(url: string): string | null {
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
  if (dpMatch) return dpMatch[1].toUpperCase();

  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  if (gpMatch) return gpMatch[1].toUpperCase();

  return null;
}

async function testSearch() {
  logger.info("=== 开始 Google 搜索测试（有头模式） ===");

  // 计算30天前的日期
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = formatDate(thirtyDaysAgo);

  logger.info(`搜索日期范围: ${dateStr} 至今`);

  // 测试类目
  const categories = [
    "Electronics",
    "Home & Living",
    "Fashion",
  ];

  // 启动浏览器（有头模式）
  logger.info("启动浏览器（有头模式）...");
  const browser = await chromium.launch({
    headless: false, // 有头模式
    slowMo: 100, // 放慢操作以便观察
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    for (const category of categories) {
      logger.info(`\n🔍 搜索类目: ${category}`);

      const query = buildSearchQuery(category, dateStr);
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      logger.info(`搜索 URL: ${searchUrl}`);

      // 导航到搜索页面
      await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });

      // 等待页面加载
      await page.waitForTimeout(3000);

      // 截图查看页面
      await page.screenshot({
        path: `search-${category.replace(/\s+/g, "-")}.png`,
        fullPage: true,
      });
      logger.info(`已保存截图: search-${category.replace(/\s+/g, "-")}.png`);

      // 提取搜索结果
      const result = await page.evaluate(() => {
        const data = {
          totalResults: 0,
          statsText: "",
          links: [] as Array<{ title: string; url: string; snippet: string }>,
          rawHtml: document.body.innerHTML.substring(0, 2000), // 前2000字符用于调试
        };

        // 搜索结果总数
        const statsEl = document.querySelector("#result-stats");
        if (statsEl) {
          data.statsText = statsEl.textContent || "";
          const match = data.statsText.match(/([\d,]+)\s*results?/i);
          if (match) {
            data.totalResults = parseInt(match[1].replace(/,/g, ""), 10);
          }
        }

        // 尝试多种选择器提取结果链接
        const selectors = [
          'div[data-ved] a[href^="http"]',
          'div.g a[href^="http"]',
          'a[jsname="UWckNb"]',
          'div.yuRUbf > a',
          'a[ping]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          logger.info(`选择器 "${selector}" 找到 ${elements.length} 个元素`);

          elements.forEach((el) => {
            const url = el.getAttribute("href") || "";
            const title = el.textContent?.trim() || "";

            // 查找对应的描述
            let snippet = "";
            const parent = el.closest("div[data-ved], div.g, div.MjjYud");
            if (parent) {
              const snippetEl = parent.querySelector("div.VwiC3b, span.aCOpRe, div.s3v94d");
              snippet = snippetEl?.textContent?.trim() || "";
            }

            if (url && !url.includes("google.com") && url.startsWith("http")) {
              data.links.push({ title: title || "(无标题)", url, snippet: snippet || "" });
            }
          });

          if (data.links.length > 0) break;
        }

        return data;
      });

      logger.info(`搜索结果总数: ${result.totalResults}`);
      logger.info(`统计文本: ${result.statsText}`);
      logger.info(`找到 ${result.links.length} 个链接`);

      // 打印前10个链接
      result.links.slice(0, 10).forEach((link, index) => {
        logger.info(`  [${index + 1}] ${link.title.substring(0, 60)}...`);
        logger.info(`      URL: ${link.url.substring(0, 80)}...`);

        // 检查是否是亚马逊链接
        const asin = extractAsinFromUrl(link.url);
        if (asin) {
          logger.info(`      🛒 Amazon ASIN: ${asin}`);
        }
      });

      // 等待几秒再搜索下一个
      await page.waitForTimeout(5000);
    }

    logger.info("\n✅ 测试完成");
  } catch (error) {
    logger.error("测试失败:", error);
  } finally {
    await browser.close();
    logger.info("浏览器已关闭");
  }
}

// 添加全局 logger 供 page.evaluate 使用
(global as any).logger = logger;

testSearch();
