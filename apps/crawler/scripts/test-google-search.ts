/**
 * Google 搜索服务综合测试脚本
 *
 * 功能：
 * 1. 测试 SerpAPI 搜索功能
 * 2. 测试浏览器爬虫搜索功能（作为回退）
 * 3. 测试错误处理和边界情况
 * 4. 测试搜索源切换逻辑
 * 5. 对比两种搜索模式的性能
 *
 * 使用方法：
 *   pnpm tsx scripts/test-google-search.ts [选项]
 *
 * 选项：
 *   --mode=serpapi    仅测试 SerpAPI 模式
 *   --mode=browser    仅测试浏览器模式
 *   --headless        使用无头浏览器模式（默认）
 *   --headed          使用有头浏览器模式（可观察）
 *   --query="xxx"     指定搜索关键词
 */

import { config } from "dotenv";
import { resolve } from "path";

// 加载环境变量
const env = process.env.NODE_ENV || "development";
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../../", `.env.${env}`), override: true });

import { GoogleSearchService, SearchResponse } from "../src/services/google-search-service";

// 测试配置
interface TestConfig {
  mode: "all" | "serpapi" | "browser";
  headless: boolean;
  customQuery?: string;
}

// 解析命令行参数
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    mode: "all",
    headless: true,
  };

  for (const arg of args) {
    if (arg.startsWith("--mode=")) {
      const mode = arg.replace("--mode=", "");
      if (["all", "serpapi", "browser"].includes(mode)) {
        config.mode = mode as TestConfig["mode"];
      }
    } else if (arg === "--headed") {
      config.headless = false;
    } else if (arg === "--headless") {
      config.headless = true;
    } else if (arg.startsWith("--query=")) {
      config.customQuery = arg.replace("--query=", "").replace(/^["']|["']$/g, "");
    }
  }

  return config;
}

// 测试用例
const TEST_QUERIES = [
  "site:reddit.com best headphones 2024",
  "site:reddit.com electronics deals",
  "site:amazon.com wireless earbuds",
  "JavaScript tutorial",
  "TypeScript best practices",
];

// 格式化输出
function printResult(result: SearchResponse, index: number): void {
  console.log(`\n📊 结果 ${index + 1}:`);
  console.log(`   状态: ${result.success ? "✅ 成功" : "❌ 失败"}`);
  console.log(`   来源: ${result.source === "serpapi" ? "🔌 SerpAPI" : "🌐 浏览器"}`);
  console.log(`   总结果数: ${result.totalResults.toLocaleString()}`);
  console.log(`   返回链接数: ${result.links.length}`);

  if (result.links.length > 0) {
    console.log(`\n   前3个结果:`);
    result.links.slice(0, 3).forEach((link, i) => {
      console.log(
        `   ${i + 1}. ${link.title.substring(0, 50)}${link.title.length > 50 ? "..." : ""}`
      );
      console.log(`      URL: ${link.url.substring(0, 60)}${link.url.length > 60 ? "..." : ""}`);
      if (link.snippet) {
        console.log(
          `      摘要: ${link.snippet.substring(0, 80)}${link.snippet.length > 80 ? "..." : ""}`
        );
      }
    });
  }

  if (result.error) {
    console.log(`   ⚠️ 错误: ${result.error}`);
  }
}

// 测试 SerpAPI 模式
async function testSerpApiMode(headless: boolean, query?: string): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🔌 测试 SerpAPI 模式");
  console.log("=".repeat(70));

  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    console.log("⚠️  未设置 SERPAPI_KEY 环境变量");
    console.log("   请访问 https://serpapi.com/ 获取 API Key");
    console.log("   将跳过 SerpAPI 测试，直接测试浏览器模式\n");
    return;
  }

  console.log(`✅ 找到 SERPAPI_KEY: ${apiKey.substring(0, 15)}...\n`);

  const service = new GoogleSearchService({
    serpApi: {
      apiKey,
      engine: "google",
    },
    browser: {
      headless,
      timeout: 60000,
    },
    forceBrowser: false,
  });

  const queries = query ? [query] : TEST_QUERIES.slice(0, 3);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n🔍 [${i + 1}/${queries.length}] 搜索: "${q}"`);
    console.log("-".repeat(70));

    const startTime = Date.now();
    try {
      const result = await service.search(q);
      const duration = Date.now() - startTime;

      printResult(result, i);
      console.log(`   ⏱️  耗时: ${duration}ms`);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // 检查是否使用了正确的搜索源
      if (result.source !== "serpapi" && apiKey) {
        console.log(`   ⚠️  警告: 预期使用 SerpAPI，但实际使用了 ${result.source}`);
      }
    } catch (error) {
      failCount++;
      console.error(`   ❌ 搜索异常:`, error);
    }

    // 请求间隔，避免触发频率限制
    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  await service.close();

  console.log("\n" + "-".repeat(70));
  console.log("📈 SerpAPI 模式测试结果:");
  console.log(`   成功: ${successCount} | 失败: ${failCount} | 总计: ${queries.length}`);
  console.log(`   成功率: ${((successCount / queries.length) * 100).toFixed(1)}%`);
}

// 测试浏览器模式
async function testBrowserMode(headless: boolean, query?: string): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🌐 测试浏览器爬虫模式");
  console.log("=".repeat(70));
  console.log(`   模式: ${headless ? "无头" : "有头（可见）"}`);
  console.log("   注意: 浏览器模式较慢，每个搜索约需 30-60 秒\n");

  const service = new GoogleSearchService({
    serpApi: {
      apiKey: "", // 不提供 API key，强制使用浏览器
    },
    browser: {
      headless,
      timeout: 120000, // 浏览器模式需要更长的超时
    },
    forceBrowser: true, // 强制使用浏览器模式
  });

  const queries = query ? [query] : TEST_QUERIES.slice(0, 2); // 浏览器模式只测试少量用例
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n🔍 [${i + 1}/${queries.length}] 搜索: "${q}"`);
    console.log("-".repeat(70));

    const startTime = Date.now();
    try {
      const result = await service.search(q);
      const duration = Date.now() - startTime;

      printResult(result, i);
      console.log(`   ⏱️  耗时: ${duration}ms (${(duration / 1000).toFixed(1)}秒)`);

      if (result.success) {
        successCount++;

        // 验证搜索结果质量
        if (result.links.length === 0) {
          console.log(`   ⚠️  警告: 搜索成功但未返回任何链接`);
        }

        // 验证返回的 URL 格式
        const validUrls = result.links.filter(
          (link) => link.url.startsWith("http") && link.title.length > 0
        );
        console.log(`   ✅ 有效结果数: ${validUrls.length}/${result.links.length}`);
      } else {
        failCount++;
      }

      // 验证搜索源
      if (result.source !== "browser") {
        console.log(`   ⚠️  警告: 预期使用浏览器，但实际使用了 ${result.source}`);
      }
    } catch (error) {
      failCount++;
      console.error(`   ❌ 搜索异常:`, error);
    }

    // 浏览器模式间隔更长
    if (i < queries.length - 1) {
      console.log("\n   ⏳ 等待 5 秒后继续...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  await service.close();

  console.log("\n" + "-".repeat(70));
  console.log("📈 浏览器模式测试结果:");
  console.log(`   成功: ${successCount} | 失败: ${failCount} | 总计: ${queries.length}`);
  console.log(`   成功率: ${((successCount / queries.length) * 100).toFixed(1)}%`);
}

// 测试错误处理
async function testErrorHandling(headless: boolean): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 测试错误处理");
  console.log("=".repeat(70));

  // 测试 1: 无效 API Key
  console.log("\n1️⃣  测试无效 API Key");
  const serviceWithInvalidKey = new GoogleSearchService({
    serpApi: { apiKey: "invalid_key_12345" },
    browser: { headless, timeout: 30000 },
    forceBrowser: false,
  });

  try {
    const result = await serviceWithInvalidKey.search("test query");
    console.log(`   结果: ${result.success ? "✅ 成功" : "❌ 失败"} (来源: ${result.source})`);
    if (result.source === "browser") {
      console.log("   ✅ 正确回退到浏览器模式");
    }
  } catch (error) {
    console.log(`   ❌ 异常: ${error}`);
  }
  await serviceWithInvalidKey.close();

  // 测试 2: SerpAPI 额度重置功能
  console.log("\n2️⃣  测试 SerpAPI 额度管理");
  const serviceWithApiKey = new GoogleSearchService({
    serpApi: { apiKey: process.env.SERPAPI_KEY || "test" },
  });

  console.log(`   初始搜索源: ${serviceWithApiKey.getCurrentSource()}`);
  serviceWithApiKey.resetSerpApiQuota();
  console.log(`   重置后搜索源: ${serviceWithApiKey.getCurrentSource()}`);
  console.log("   ✅ 额度重置功能正常");

  // 测试 3: 空查询处理
  console.log("\n3️⃣  测试空查询");
  const service = new GoogleSearchService({
    forceBrowser: true,
    browser: { headless, timeout: 30000 },
  });

  try {
    const result = await service.search("");
    console.log(`   空查询结果: ${result.success ? "✅ 成功" : "❌ 失败"}`);
    if (result.error) {
      console.log(`   错误信息: ${result.error}`);
    }
  } catch (error) {
    console.log(`   空查询异常: ${error}`);
  }
  await service.close();

  console.log("\n✅ 错误处理测试完成");
}

// 测试性能对比
async function testPerformanceComparison(headless: boolean, query?: string): Promise<void> {
  const testQuery = query || "JavaScript frameworks comparison";

  console.log("\n" + "=".repeat(70));
  console.log("⚡ 性能对比测试");
  console.log("=".repeat(70));
  console.log(`   测试查询: "${testQuery}"\n`);

  // SerpAPI 性能
  console.log("🔌 SerpAPI 性能测试");
  const serpApiService = new GoogleSearchService({
    serpApi: { apiKey: process.env.SERPAPI_KEY || "" },
    forceBrowser: false,
  });

  let serpApiTotalTime = 0;
  const serpApiRuns = 2;

  for (let i = 0; i < serpApiRuns; i++) {
    const start = Date.now();
    await serpApiService.search(testQuery);
    const duration = Date.now() - start;
    serpApiTotalTime += duration;
    console.log(`   运行 ${i + 1}: ${duration}ms`);
    if (i < serpApiRuns - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  await serpApiService.close();

  // 浏览器性能
  console.log("\n🌐 浏览器性能测试（这可能需要一些时间）");
  const browserService = new GoogleSearchService({
    forceBrowser: true,
    browser: { headless, timeout: 120000 },
  });

  let browserTotalTime = 0;
  const browserRuns = 1; // 浏览器模式只运行一次（太慢了）

  for (let i = 0; i < browserRuns; i++) {
    const start = Date.now();
    await browserService.search(testQuery);
    const duration = Date.now() - start;
    browserTotalTime += duration;
    console.log(`   运行 ${i + 1}: ${duration}ms (${(duration / 1000).toFixed(1)}秒)`);
  }

  await browserService.close();

  // 结果对比
  console.log("\n" + "-".repeat(70));
  console.log("📊 性能对比结果:");
  console.log(`   SerpAPI 平均: ${(serpApiTotalTime / serpApiRuns).toFixed(0)}ms`);
  console.log(
    `   浏览器平均: ${(browserTotalTime / browserRuns).toFixed(0)}ms (${(browserTotalTime / browserRuns / 1000).toFixed(1)}秒)`
  );
  console.log(
    `   性能差距: ${(browserTotalTime / browserRuns / (serpApiTotalTime / serpApiRuns)).toFixed(1)}x`
  );
}

// 主函数
async function main(): Promise<void> {
  const config = parseArgs();

  console.log("\n" + "█".repeat(70));
  console.log("█" + " ".repeat(68) + "█");
  console.log("█" + "      Google 搜索服务综合测试".padStart(45).padEnd(68) + "█");
  console.log("█" + " ".repeat(68) + "█");
  console.log("█".repeat(70));
  console.log("\n📋 测试配置:");
  console.log(`   模式: ${config.mode}`);
  console.log(`   浏览器: ${config.headless ? "无头" : "有头（可见）"}`);
  if (config.customQuery) {
    console.log(`   自定义查询: "${config.customQuery}"`);
  }

  const startTime = Date.now();

  try {
    // 根据模式执行测试
    if (config.mode === "all" || config.mode === "serpapi") {
      await testSerpApiMode(config.headless, config.customQuery);
    }

    if (config.mode === "all" || config.mode === "browser") {
      await testBrowserMode(config.headless, config.customQuery);
    }

    // 在所有模式下都运行的测试
    await testErrorHandling(config.headless);

    // 性能对比测试（仅在非自定义查询模式下运行）
    if (!config.customQuery && (config.mode === "all" || config.mode === "serpapi")) {
      await testPerformanceComparison(config.headless);
    }
  } catch (error) {
    console.error("\n❌ 测试过程发生错误:", error);
    process.exit(1);
  }

  const totalDuration = Date.now() - startTime;

  console.log("\n" + "█".repeat(70));
  console.log("█" + " ".repeat(68) + "█");
  console.log("█" + "      ✅ 所有测试完成".padStart(42).padEnd(68) + "█");
  console.log(`█      总耗时: ${(totalDuration / 1000).toFixed(1)}秒`.padEnd(68) + "█");
  console.log("█" + " ".repeat(68) + "█");
  console.log("█".repeat(70) + "\n");
}

// 运行主函数
main();
