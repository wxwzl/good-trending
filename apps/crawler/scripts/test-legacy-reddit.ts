/**
 * Legacy Reddit Crawler 真实 URL 测试
 */

import { RedditService } from "../src/services/reddit-service.js";
import { chromium } from "playwright";

const REAL_REDDIT_URL =
  "https://www.reddit.com/r/headphones/comments/1fecifp/test_drive_review_of_many_2024_anc_headphones/";

async function testLegacyReddit() {
  console.log("🔍 测试 Legacy Reddit Crawler");
  console.log("URL:", REAL_REDDIT_URL);
  console.log();

  const service = new RedditService();
  let browser;

  try {
    // Legacy 服务需要外部提供 browser 和 page
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--no-sandbox",
        "--window-size=1920,1080",
      ],
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    const post = await service.fetchPost(page, REAL_REDDIT_URL);

    if (post) {
      console.log("✅ 成功获取帖子!");
      console.log("=".repeat(60));
      console.log("标题:", post.title);
      console.log("作者:", post.author || "N/A");
      console.log("点赞:", post.upvotes || "N/A");
      console.log("发布时间:", post.postedAt || "N/A");
      console.log("评论数:", post.comments.length);
      console.log("=".repeat(60));

      if (post.content) {
        console.log("\n内容预览:");
        console.log(post.content.substring(0, 200) + "...");
      }

      if (post.comments.length > 0) {
        console.log("\n前 3 条评论:");
        post.comments.slice(0, 3).forEach((comment, i) => {
          console.log(`\n${i + 1}. ${comment.substring(0, 100)}...`);
        });
      }
    } else {
      console.log("⚠️ 未获取到帖子数据");
    }
  } catch (error) {
    console.error("❌ 错误:", error);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\n浏览器已关闭");
    }
  }
}

testLegacyReddit();
