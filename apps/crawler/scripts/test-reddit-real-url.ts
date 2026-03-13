/**
 * Reddit Crawler 真实 URL 测试
 */

import { createRedditCrawler } from "../src/adapters/crawlee/index.js";

const REAL_REDDIT_URL =
  "https://www.reddit.com/r/headphones/comments/1fecifp/test_drive_review_of_many_2024_anc_headphones/";

async function testRedditWithRealUrl() {
  console.log("🔍 测试 Reddit Crawler - 真实 URL");
  console.log("URL:", REAL_REDDIT_URL);
  console.log();

  const crawler = createRedditCrawler();

  try {
    const post = await crawler.fetchPost(REAL_REDDIT_URL);

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
    await crawler.close();
  }
}

testRedditWithRealUrl();
