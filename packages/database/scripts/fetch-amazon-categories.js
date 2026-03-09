#!/usr/bin/env node
/**
 * 爬取亚马逊畅销榜分类数据
 * 目标: https://www.amazon.com/gp/bestsellers
 * 输出: category.json
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function fetchAmazonCategories() {
  console.log("🚀 开始爬取亚马逊畅销榜分类...");

  const browser = await chromium.launch({
    headless: true,
  });

  const categories = [];

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "en-US",
    });

    const page = await context.newPage();

    // 访问亚马逊畅销榜页面（使用旧的导航页）
    console.log("📄 访问页面: https://www.amazon.com/gp/bestsellers");
    try {
      await page.goto("https://www.amazon.com/gp/bestsellers", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch {
      // 即使超时也继续，等待页面内容
    }

    // 等待页面内容加载
    console.log("⏳ 等待页面内容...");
    await page.waitForTimeout(8000);

    // 如果页面被重定向，尝试访问特定分类
    const currentUrl = page.url();
    console.log(`📍 当前页面: ${currentUrl}`);

    // 尝试访问电子产品的bestsellers页面，它通常有完整的左侧导航
    console.log("📄 尝试访问 Electronics Best Sellers...");
    try {
      await page.goto("https://www.amazon.com/gp/bestsellers/electronics", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(5000);
    } catch {
      // 继续
    }

    // 提取分类数据
    console.log("🔍 提取分类数据...");

    // 等待导航栏加载
    try {
      await page.waitForSelector(
        '[role="navigation"], #zg_left_colleftnav, [data-testid="zg-nav-link"]',
        {
          timeout: 10000,
        }
      );
    } catch {
      console.log("⚠️ 导航栏选择器未找到，继续尝试其他方式...");
    }

    // 获取页面标题和调试信息
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 500),
    }));
    console.log("📄 页面信息:", pageInfo);

    const categoryData = await page.evaluate(() => {
      const items = [];

      // 尝试从页面文本中提取分类（下拉菜单中的部门列表）
      const bodyText = document.body.innerText;
      const lines = bodyText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // 找到 "All Departments" 后面的分类列表
      let startIndex = lines.indexOf("All Departments");
      if (startIndex === -1) {
        startIndex = lines.indexOf("Electronics");
      }

      if (startIndex !== -1) {
        // 从startIndex开始收集分类名称（通常是连续的部门名称）
        for (let i = startIndex; i < Math.min(startIndex + 50, lines.length); i++) {
          const line = lines[i];

          // 过滤有效的分类名称
          const isValidCategory =
            line &&
            line.length > 2 &&
            line.length < 50 &&
            !line.includes("alt") &&
            !line.includes("+") &&
            !line.includes("shift") &&
            !line.startsWith("http") &&
            !line.includes("Amazon Best") &&
            !line.includes("Skip to") &&
            !line.includes("Main content") &&
            !line.includes("Keyboard") &&
            !line.includes("Search") &&
            !line.includes("Cart") &&
            !line.includes("Home") &&
            !line.includes("Orders") &&
            !line.includes("Delivering") &&
            !line.includes("Update location") &&
            !line.includes("Show/Hide") &&
            !line.includes("To move between");

          if (isValidCategory) {
            // 将分类名称转换为URL友好的格式
            const categorySlug = line
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .replace(/\s+/g, "-")
              .substring(0, 50);

            items.push({
              name: line,
              url: `https://www.amazon.com/gp/bestsellers/${categorySlug}`,
              categoryId: categorySlug,
              parentCategory: null,
            });
          }
        }
      }

      // 如果上面的方法没找到数据，尝试用选择器
      if (items.length === 0) {
        // 尝试多种选择器来找到分类链接
        const selectors = [
          "#searchDropdownBox option",
          'select[name="url"] option',
          '[data-cy="department-filter"] a',
          "#zg_left_colleftnav a",
          "._p13n-zg-nav-tree-all_style_zg-nav-item__1RDtF a",
          '[data-testid="zg-nav-link"]',
          ".zg-nav-item a",
          '[role="navigation"] a[href*="bestsellers"]',
          'nav a[href*="bestsellers"]',
          'a[href*="/bestsellers/"]',
          '.a-link-normal[href*="bestsellers"]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach((el) => {
              const name = el.textContent?.trim();
              const href = el.getAttribute("href");

              const isValidCategory =
                name &&
                href &&
                href.includes("bestsellers") &&
                !href.includes("signin") &&
                !href.includes("register") &&
                !href.includes("/ap/") &&
                name.length > 1 &&
                name !== "See More" &&
                name !== "Back to top" &&
                !name.includes("Learn more") &&
                !name.includes("sign in") &&
                !name.includes("Sign in") &&
                !name.includes("Start here");

              if (isValidCategory) {
                const match = href.match(/\/bestsellers\/([^\/\?]+)(?:\/([^\/\?]+))?/);
                const parentCategory = match ? match[1] : null;
                const categoryId = match && match[2] ? match[2] : parentCategory;
                const cleanName = name.replace(/\s+/g, " ").trim();

                items.push({
                  name: cleanName,
                  url: href.startsWith("http") ? href : `https://www.amazon.com${href}`,
                  categoryId,
                  parentCategory,
                });
              }
            });

            if (items.length > 3) break;
          }
        }
      }

      // 去重
      const uniqueItems = [];
      const seen = new Set();
      for (const item of items) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          uniqueItems.push(item);
        }
      }

      return uniqueItems;
    });

    categories.push(...categoryData);

    console.log(`✅ 找到 ${categories.length} 个分类`);

    // 显示前10个分类
    if (categories.length > 0) {
      console.log("\n📋 前10个分类预览:");
      categories.slice(0, 10).forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat.name}`);
        console.log(`     URL: ${cat.url}`);
      });
    }
  } catch (error) {
    console.error("❌ 爬取失败:", error.message);
  } finally {
    await browser.close();
  }

  // 保存到文件 - 直接使用数组格式
  const outputPath = path.join(process.cwd(), "category.json");

  fs.writeFileSync(outputPath, JSON.stringify(categories, null, 2), "utf-8");
  console.log(`\n💾 数据已保存到: ${outputPath}`);
  console.log(`📊 共 ${categories.length} 个分类`);

  return categories;
}

// 执行
fetchAmazonCategories()
  .then(() => {
    console.log("\n🎉 完成!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 执行失败:", error);
    process.exit(1);
  });
