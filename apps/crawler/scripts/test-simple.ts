/**
 * 简单测试 - 验证 Crawlee 可以正常工作
 */

import { PlaywrightCrawler } from "crawlee";
import { createLoggerInstance } from "@good-trending/shared";
import { getStealthInitFunction } from "../src/infrastructure/index.js";

const logger = createLoggerInstance("test-simple");

async function testSimpleCrawl() {
  logger.info("开始简单 Crawlee 测试");

  const results: any[] = [];

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandler: async ({ page, request }) => {
      logger.info(`处理: ${request.url}`);

      const title = await page.title();
      logger.info(`标题: ${title}`);

      // 数据已存入 results 数组
      results.push({ url: request.url, title });
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.addInitScript(getStealthInitFunction());
      },
    ],
  });

  try {
    await crawler.run(["https://www.google.com"]);

    logger.info(`爬取完成，结果数: ${results.length}`);
    results.forEach((r, i) => {
      logger.info(`  ${i + 1}. ${r.title}`);
    });

    return true;
  } catch (error) {
    logger.error("爬取失败:", error);
    return false;
  }
}

testSimpleCrawl().then((success) => {
  process.exit(success ? 0 : 1);
});
