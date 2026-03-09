# 爬虫和调度器问题修复计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复爬虫和调度器中的所有关键问题，包括数据库表结构、Bitmap更新逻辑、昨天数据统计等

**Architecture:** 基于现有的 GoogleSearchCrawler 架构，扩展类目热度统计表字段，修复 Bitmap 更新逻辑，添加昨天数据统计任务

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, BullMQ, Playwright

---

## 问题清单

1. 🔴 **类目热度统计表结构不完整** - 缺少 yesterday/last7days 字段
2. 🔴 **Bitmap 更新逻辑不正确** - 错误地检查 firstSeenAt 而不是实际出现记录
3. 🔴 **缺少昨天的数据统计逻辑** - 没有专门的昨天数据统计任务
4. 🟡 **数据库迁移文件缺失** - 需要生成新的迁移文件
5. 🟡 **类目数据初始化不完整** - 需要确保类目数据正确导入
6. 🟡 **爬虫日志表缺少 categoryId** - 处理器中没有设置 categoryId

---

## 前置依赖

### 检查数据库连接

```bash
cd packages/database
pnpm db:push
```

---

## Task 1: 修复类目热度统计表结构

**Files:**

- Modify: `packages/database/src/schema/tables.ts:53-76`

**Step 1: 添加 yesterday 和 last7days 字段**

```typescript
export const categoryHeatStats = pgTable(
  "category_heat_stat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull(),
    // Reddit 搜索结果总数
    redditResultCount: integer("reddit_result_count").default(0).notNull(),
    // X 平台搜索结果总数
    xResultCount: integer("x_result_count").default(0).notNull(),
    // 昨天的搜索结果数
    yesterdayRedditCount: integer("yesterday_reddit_count").default(0).notNull(),
    yesterdayXCount: integer("yesterday_x_count").default(0).notNull(),
    // 近7天的搜索结果数
    last7DaysRedditCount: integer("last_7_days_reddit_count").default(0).notNull(),
    last7DaysXCount: integer("last_7_days_x_count").default(0).notNull(),
    // 今日爬取到的商品数量
    crawledProductCount: integer("crawled_product_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("category_heat_category_date_idx").on(table.categoryId, table.statDate),
    index("category_heat_date_idx").on(table.statDate),
  ]
);
```

**Step 2: 更新 saveCategoryHeatStats 函数支持新字段**

**Files:**

- Modify: `apps/crawler/src/services/crawler-data-processor.ts:31-78`
- Modify: `apps/crawler/src/types/crawler.types.ts:51-58`

```typescript
// 更新类型定义
export interface CategoryHeatResult {
  categoryId: string;
  categoryName: string;
  statDate: Date;
  redditResultCount: number;
  xResultCount: number;
  yesterdayRedditCount?: number;
  yesterdayXCount?: number;
  last7DaysRedditCount?: number;
  last7DaysXCount?: number;
}
```

```typescript
// 更新保存函数
export async function saveCategoryHeatStats(stats: CategoryHeatResult[]): Promise<number> {
  let savedCount = 0;

  for (const stat of stats) {
    try {
      const existing = await db
        .select({ id: categoryHeatStats.id })
        .from(categoryHeatStats)
        .where(
          and(
            eq(categoryHeatStats.categoryId, stat.categoryId),
            eq(categoryHeatStats.statDate, stat.statDate.toISOString().split("T")[0])
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // 更新 - 使用对象构建，只更新有值的字段
        const updateData: any = {
          redditResultCount: stat.redditResultCount,
          xResultCount: stat.xResultCount,
          updatedAt: new Date(),
        };

        if (stat.yesterdayRedditCount !== undefined) {
          updateData.yesterdayRedditCount = stat.yesterdayRedditCount;
        }
        if (stat.yesterdayXCount !== undefined) {
          updateData.yesterdayXCount = stat.yesterdayXCount;
        }
        if (stat.last7DaysRedditCount !== undefined) {
          updateData.last7DaysRedditCount = stat.last7DaysRedditCount;
        }
        if (stat.last7DaysXCount !== undefined) {
          updateData.last7DaysXCount = stat.last7DaysXCount;
        }

        await db
          .update(categoryHeatStats)
          .set(updateData)
          .where(eq(categoryHeatStats.id, existing[0].id));
      } else {
        // 插入
        await db.insert(categoryHeatStats).values({
          id: createId(),
          categoryId: stat.categoryId,
          statDate: stat.statDate.toISOString().split("T")[0],
          redditResultCount: stat.redditResultCount,
          xResultCount: stat.xResultCount,
          yesterdayRedditCount: stat.yesterdayRedditCount ?? 0,
          yesterdayXCount: stat.yesterdayXCount ?? 0,
          last7DaysRedditCount: stat.last7DaysRedditCount ?? 0,
          last7DaysXCount: stat.last7DaysXCount ?? 0,
        });
      }

      savedCount++;
    } catch (error) {
      console.error(`保存类目热度统计失败 [${stat.categoryId}]:`, error);
    }
  }

  return savedCount;
}
```

**Step 3: 推送数据库结构变更**

Run:

```bash
cd packages/database
pnpm db:push
```

Expected: 数据库表结构更新成功

**Step 4: Commit**

```bash
git add packages/database/src/schema/tables.ts
git add apps/crawler/src/types/crawler.types.ts
git add apps/crawler/src/services/crawler-data-processor.ts
git commit -m "fix: 添加类目热度统计表的 yesterday 和 last7days 字段"
```

---

## Task 2: 修复 Bitmap 更新逻辑

**Files:**

- Modify: `apps/crawler/src/services/crawler-data-processor.ts:160-236`
- Create: `apps/crawler/src/services/crawler-data-processor.ts` 新增辅助函数

**Step 1: 创建正确的商品出现检查函数**

```typescript
/**
 * 检查商品今天是否出现在任何类目中
 * 通过检查 categoryHeatStats.crawledProductCount
 */
async function checkProductAppearedToday(productId: string, today: string): Promise<boolean> {
  // 查询该商品关联的类目今天是否有爬取记录
  const result = await db
    .select({
      count: sql`count(*)`.mapWith(Number),
      totalCrawled: sql`sum(${categoryHeatStats.crawledProductCount})`.mapWith(Number),
    })
    .from(productCategories)
    .innerJoin(
      categoryHeatStats,
      and(
        eq(productCategories.categoryId, categoryHeatStats.categoryId),
        eq(categoryHeatStats.statDate, today)
      )
    )
    .where(eq(productCategories.productId, productId));

  // 如果有类目今天被爬取且爬取到了商品，则认为该商品今天出现
  return (result[0]?.totalCrawled ?? 0) > 0;
}
```

**Step 2: 更新 updateAllProductsBitmap 函数**

```typescript
/**
 * 更新所有商品的 Bitmap 统计（滑动窗口）
 * 每天调用一次，更新近7/15/30/60天的出现记录
 */
export async function updateAllProductsBitmap(date: Date = new Date()): Promise<number> {
  const today = date.toISOString().split("T")[0];
  let updatedCount = 0;

  // 获取所有商品的统计记录
  const stats = await db
    .select({
      id: productAppearanceStats.id,
      productId: productAppearanceStats.productId,
      bitmap7: productAppearanceStats.last7DaysBitmap,
      bitmap15: productAppearanceStats.last15DaysBitmap,
      bitmap30: productAppearanceStats.last30DaysBitmap,
      bitmap60: productAppearanceStats.last60DaysBitmap,
      lastUpdateDate: productAppearanceStats.lastUpdateDate,
    })
    .from(productAppearanceStats);

  for (const stat of stats) {
    try {
      // 计算上次更新到今天的天数差
      const lastUpdate = stat.lastUpdateDate ? new Date(stat.lastUpdateDate) : date;
      const daysDiff = Math.floor((date.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) {
        // 今天已经更新过
        continue;
      }

      // 检查商品今天是否出现在任何类目中
      const todayAppeared = await checkProductAppearedToday(stat.productId, today);

      // 使用 shared 包的 BigInt bitmap 函数
      let newBitmap7 = BigInt(stat.bitmap7 || 0);
      let newBitmap15 = BigInt(stat.bitmap15 || 0);
      let newBitmap30 = BigInt(stat.bitmap30 || 0);
      let newBitmap60 = BigInt(stat.bitmap60 || 0);

      // 滑动窗口更新（每天左移一位）
      for (let i = 0; i < daysDiff; i++) {
        newBitmap7 = updateBitmap(newBitmap7, 7, false);
        newBitmap15 = updateBitmap(newBitmap15, 15, false);
        newBitmap30 = updateBitmap(newBitmap30, 30, false);
        newBitmap60 = updateBitmap(newBitmap60, 60, false);
      }

      // 设置今天的状态
      if (todayAppeared) {
        newBitmap7 = newBitmap7 | 1n;
        newBitmap15 = newBitmap15 | 1n;
        newBitmap30 = newBitmap30 | 1n;
        newBitmap60 = newBitmap60 | 1n;
      }

      // 更新数据库
      await db
        .update(productAppearanceStats)
        .set({
          last7DaysBitmap: Number(newBitmap7),
          last15DaysBitmap: Number(newBitmap15),
          last30DaysBitmap: Number(newBitmap30),
          last60DaysBitmap: Number(newBitmap60),
          lastUpdateDate: today,
          updatedAt: new Date(),
        })
        .where(eq(productAppearanceStats.id, stat.id));

      updatedCount++;
    } catch (error) {
      console.error(`更新 Bitmap 失败 [${stat.productId}]:`, error);
    }
  }

  return updatedCount;
}
```

**Step 3: 更新导入**

```typescript
import { updateBitmap, countBitmap } from "@good-trending/shared";
```

**Step 4: Commit**

```bash
git add apps/crawler/src/services/crawler-data-processor.ts
git commit -m "fix: 修复 Bitmap 更新逻辑，正确检查商品今天是否出现"
```

---

## Task 3: 添加昨天数据统计功能

**Files:**

- Modify: `apps/crawler/src/google/google-search-crawler.ts:117-159`
- Modify: `apps/crawler/src/cli.ts:78-127`
- Modify: `apps/crawler/src/types/crawler.types.ts`

**Step 1: 添加昨天数据统计方法到 GoogleSearchCrawler**

```typescript
/**
 * 爬取昨天一天的数据
 * 搜索: site:reddit.com 类目名称 after:昨天 before:今天
 */
async crawlYesterdayCategoryHeat(
  categories: CategoryData[],
  date: Date = new Date()
): Promise<CrawlerExecutionResult<CategoryHeatResult>> {
  const startTime = new Date();
  const results: CategoryHeatResult[] = [];
  const errors: string[] = [];

  // 计算昨天日期
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = this.formatDate(yesterday);
  const todayStr = this.formatDate(date);

  this.logger.info(`开始爬取 ${categories.length} 个类目的昨天数据 (${yesterdayStr})`);

  // 初始化浏览器
  await this.initBrowser();

  for (const category of categories) {
    try {
      await this.delay(this.getRandomDelay());

      const keyword = category.searchKeywords || category.name;

      // 搜索 Reddit（昨天一天）
      const redditQuery = this.buildSearchQuery(keyword, "REDDIT", yesterdayStr, todayStr);
      const redditResult = await this.performGoogleSearch(redditQuery);

      await this.delay(1000);

      // 搜索 X（昨天一天）
      const xQuery = this.buildSearchQuery(keyword, "X_PLATFORM", yesterdayStr, todayStr);
      const xResult = await this.performGoogleSearch(xQuery);

      results.push({
        categoryId: category.id,
        categoryName: category.name,
        statDate: yesterday,
        redditResultCount: 0, // 今天数据为0
        xResultCount: 0,
        yesterdayRedditCount: redditResult.totalResults,
        yesterdayXCount: xResult.totalResults,
      });

      this.logger.info(
        `类目 "${category.name}" 昨天数据: Reddit=${redditResult.totalResults}, X=${xResult.totalResults}`
      );
    } catch (error) {
      const errorMsg = `爬取类目 "${category.name}" 昨天数据失败: ${error}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  const endTime = new Date();

  return {
    success: errors.length === 0,
    data: results,
    errors,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
  };
}
```

**Step 2: 添加昨天商品发现方法**

```typescript
/**
 * 爬取昨天的商品（搜索昨天一天的数据）
 */
async crawlYesterdayProducts(
  categories: CategoryData[],
  date: Date = new Date()
): Promise<CrawlerExecutionResult<CrawledProduct>> {
  const startTime = new Date();
  const results: CrawledProduct[] = [];
  const errors: string[] = [];
  const seenAsins = new Set<string>();

  // 计算昨天日期
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = this.formatDate(yesterday);
  const todayStr = this.formatDate(date);

  this.logger.info(`开始从 ${categories.length} 个类目搜索昨天的商品`);

  // 初始化浏览器
  await this.initBrowser();

  for (const category of categories) {
    try {
      await this.delay(this.getRandomDelay());

      const keyword = category.searchKeywords || category.name;

      this.logger.info(`搜索类目 "${keyword}" 昨天的 Reddit 帖子`);

      // 搜索 Reddit（昨天一天）
      const redditQuery = this.buildSearchQuery(keyword, "REDDIT", yesterdayStr, todayStr);
      this.logger.info(`搜索查询: ${redditQuery}`);

      const redditResult = await this.performGoogleSearch(redditQuery);
      this.logger.info(`找到 ${redditResult.links.length} 个搜索结果`);

      // 从 Reddit 结果中提取亚马逊商品
      const maxResults = this.searchConfig.categoryConfig?.maxResultsPerCategory ?? 30;
      const redditProducts = await this.extractAmazonProductsFromLinks(
        redditResult.links.slice(0, maxResults)
      );

      for (const product of redditProducts) {
        // 去重
        if (!seenAsins.has(product.amazonId)) {
          seenAsins.add(product.amazonId);
          results.push({
            ...product,
            discoveredFromCategory: category.id,
            firstSeenAt: yesterday,
          });
        }
      }

      this.logger.info(`类目 "${category.name}" 发现 ${redditProducts.length} 个新商品`);
    } catch (error) {
      const errorMsg = `搜索类目 "${category.name}" 昨天商品失败: ${error}`;
      this.logger.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  const endTime = new Date();

  return {
    success: errors.length === 0,
    data: results,
    errors,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
  };
}
```

**Step 3: 添加 CLI 命令支持昨天数据爬取**

```typescript
/**
 * 执行昨天数据统计爬取
 */
async function crawlYesterdayData(headless: boolean): Promise<void> {
  logger.info("=== 开始昨天数据统计爬取 ===");
  const startTime = new Date();

  const log: CrawlerLogData = {
    taskType: "YESTERDAY_STATS",
    sourceType: "REDDIT",
    status: "RUNNING",
    startTime,
    itemsFound: 0,
    itemsSaved: 0,
  };

  try {
    // 获取类目
    const categoryList = await getAllCategories();
    logger.info(`加载了 ${categoryList.length} 个类目`);

    // 创建爬虫
    const crawler = new GoogleSearchCrawler(
      { headless, timeout: 60000 },
      {
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 步骤1: 爬取昨天类目热度
    logger.info("步骤1: 爬取昨天类目热度...");
    const heatResult = await crawler.crawlYesterdayCategoryHeat(categoryList);
    const heatSaved = await saveCategoryHeatStats(heatResult.data);
    logger.info(`类目热度保存完成: ${heatSaved} 条`);

    // 步骤2: 爬取昨天商品
    logger.info("步骤2: 爬取昨天商品...");
    const productResult = await crawler.crawlYesterdayProducts(categoryList);
    const saveResult = await saveCrawledProducts(productResult.data, "REDDIT");
    logger.info(`商品保存完成: 新商品 ${saveResult.savedCount}, 跳过 ${saveResult.skippedCount}`);

    // 更新日志
    log.status = "COMPLETED";
    log.itemsFound = productResult.data.length;
    log.itemsSaved = saveResult.savedCount;

    await crawler["closeBrowser"]();
  } catch (error) {
    log.status = "FAILED";
    log.errors = [{ message: error instanceof Error ? error.message : String(error) }];
    logger.error("昨天数据统计爬取失败:", error);
  } finally {
    const endTime = new Date();
    log.endTime = endTime;
    log.duration = endTime.getTime() - startTime.getTime();
    await saveCrawlerLog(log);
  }
}
```

**Step 4: 更新 CLI 命令选项**

```typescript
.option("command", {
  alias: "c",
  type: "string",
  description: "爬取命令",
  choices: ["category-heat", "products", "mentions", "yesterday", "full"],
  default: "full",
})
```

**Step 5: 在 switch 中添加 yesterday 处理**

```typescript
case "yesterday":
  await crawlYesterdayData(argv.headless);
  break;
```

**Step 6: 更新 CrawlerTaskType 类型**

```typescript
export type CrawlerTaskType =
  | "CATEGORY_HEAT"
  | "PRODUCT_DISCOVERY"
  | "PRODUCT_MENTION"
  | "YESTERDAY_STATS"; // 新增
```

**Step 7: Commit**

```bash
git add apps/crawler/src/google/google-search-crawler.ts
git add apps/crawler/src/cli.ts
git add apps/crawler/src/types/crawler.types.ts
git commit -m "feat: 添加昨天数据统计功能"
```

---

## Task 4: 添加调度器的昨天数据统计任务

**Files:**

- Modify: `apps/scheduler/src/queue/index.ts`
- Modify: `apps/scheduler/src/processors/crawler.processor.ts`
- Modify: `apps/scheduler/src/scheduler/index.scheduler.ts`

**Step 1: 添加任务类型常量**

```typescript
export const JOB_TYPES = {
  // ... 其他类型
  CRAWL_YESTERDAY_STATS: "crawl-yesterday-stats",
} as const;
```

**Step 2: 添加处理器函数**

```typescript
/**
 * 处理昨天数据统计任务
 */
async function processYesterdayStatsJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`Processing yesterday stats job`, {
    jobId: job.id,
    traceId: data.traceId,
  });

  const result: CrawlerJobResult = {
    source: "yesterday-stats",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    const { GoogleSearchCrawler, saveCategoryHeatStats, saveCrawledProducts, saveCrawlerLog } =
      await importCrawler();
    const { db, categories } = await import("@good-trending/database");

    // 获取所有类目
    const categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        searchKeywords: categories.searchKeywords,
      })
      .from(categories);

    logger.info(`Loaded ${categoryList.length} categories for yesterday stats`);

    // 创建爬虫
    const crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: 60000 },
      {
        serpApiKey: process.env.SERPAPI_KEY,
        categoryConfig: {
          maxResultsPerCategory: 30,
          maxProductsPerCategory: data.maxProducts ?? 10,
          searchDelayRange: [5000, 10000],
        },
      }
    );

    // 爬取昨天类目热度
    const heatResult = await crawler.crawlYesterdayCategoryHeat(categoryList);
    if (heatResult.data.length > 0) {
      await saveCategoryHeatStats(heatResult.data);
    }

    // 爬取昨天商品
    const productResult = await crawler.crawlYesterdayProducts(categoryList);
    result.totalProducts = productResult.data.length;

    if (data.saveToDb !== false && productResult.data.length > 0) {
      const saveResult = await saveCrawledProducts(productResult.data, "REDDIT");
      result.savedProducts = saveResult.savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "YESTERDAY_STATS",
      sourceType: "REDDIT",
      status: productResult.success ? "COMPLETED" : "FAILED",
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors:
        productResult.errors.length > 0
          ? productResult.errors.map((e) => ({ message: e }))
          : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        categoryCount: categoryList.length,
      },
    });

    logger.info(`Yesterday stats job completed`, {
      jobId: job.id,
      totalCategories: heatResult.data.length,
      totalProducts: result.totalProducts,
      savedCount: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Yesterday stats job failed`, {
      jobId: job.id,
      error: errorMessage,
    });

    result.errorCount = 1;
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    throw error;
  }
}
```

**Step 3: 更新 processCrawlerJob 路由**

```typescript
switch (data.source) {
  case "category-heat":
    return processCategoryHeatJob(job);
  case "product-discovery":
    return processProductDiscoveryJob(job);
  case "product-mentions":
    return processProductMentionsJob(job);
  case "yesterday-stats":
    return processYesterdayStatsJob(job);
  default:
    throw new Error(`Unknown crawler source: ${data.source}`);
}
```

**Step 4: 更新调度器的 Cron 任务**

```typescript
// 每天凌晨2点：昨天数据统计
scheduleJob("crawl-yesterday-stats", CRON_SCHEDULES.DAILY_2AM, async () => {
  await scheduleYesterdayStatsJob(crawlerQueue);
});

// 添加 scheduleYesterdayStatsJob 函数
async function scheduleYesterdayStatsJob(queue: Queue<CrawlerJobData>): Promise<void> {
  const traceId = generateTraceId();

  logger.info(`Adding yesterday stats job to queue`, { traceId });

  await queue.add(
    JOB_TYPES.CRAWL_YESTERDAY_STATS,
    {
      source: "yesterday-stats",
      maxProducts: 10,
      headless: true,
      saveToDb: true,
      triggeredBy: "scheduler",
      traceId,
    },
    {
      jobId: `yesterday-stats-${traceId}`,
      removeOnComplete: { age: 24 * 3600, count: 100 },
      removeOnFail: { age: 7 * 24 * 3600, count: 500 },
    }
  );
}
```

**Step 5: Commit**

```bash
git add apps/scheduler/src/queue/index.ts
git add apps/scheduler/src/processors/crawler.processor.ts
git add apps/scheduler/src/scheduler/index.scheduler.ts
git commit -m "feat: 调度器添加昨天数据统计任务"
```

---

## Task 5: 生成数据库迁移文件

**Files:**

- Create: `packages/database/migrations/`

**Step 1: 生成迁移文件**

Run:

```bash
cd packages/database
pnpm db:generate
```

Expected: 在 migrations 目录生成新的 SQL 文件

**Step 2: 检查生成的迁移文件**

Run:

```bash
ls -la packages/database/migrations/
```

Expected: 看到类似 `0000_initial.sql` 和 `meta/` 目录

**Step 3: Commit**

```bash
git add packages/database/migrations/
git commit -m "chore: 生成数据库迁移文件"
```

---

## Task 6: 修复爬虫日志缺少 categoryId

**Files:**

- Modify: `apps/crawler/src/services/crawler-data-processor.ts:389-408`
- Modify: `apps/crawler/src/cli.ts`

**Step 1: 更新 saveCrawlerLog 函数接受 categoryId**

```typescript
/**
 * 保存爬虫日志
 */
export async function saveCrawlerLog(log: CrawlerLogData & { categoryId?: string }): Promise<void> {
  try {
    await db.insert(crawlerLogs).values({
      id: createId(),
      taskType: log.taskType,
      sourceType: log.sourceType,
      categoryId: log.categoryId || null,
      status: log.status,
      startTime: log.startTime,
      endTime: log.endTime || null,
      duration: log.duration || 0,
      itemsFound: log.itemsFound,
      itemsSaved: log.itemsSaved,
      errors: log.errors || [],
      metadata: log.metadata || {},
    });
  } catch (error) {
    console.error("保存爬虫日志失败:", error);
  }
}
```

**Step 2: 在 CLI 中传递 categoryId**

```typescript
// 在 crawlCategoryHeat 函数中
await saveCrawlerLog({
  taskType: "CATEGORY_HEAT",
  sourceType: "REDDIT",
  status: result.success ? "COMPLETED" : "FAILED",
  startTime,
  endTime,
  duration: result.duration,
  itemsFound: result.totalProducts,
  itemsSaved: savedCount,
  categoryId: categoryList[0]?.id, // 可以记录第一个类目ID或改进为记录所有类目
  errors: result.errors.length > 0 ? result.errors.map((e) => ({ message: e })) : undefined,
});
```

**Step 3: Commit**

```bash
git add apps/crawler/src/services/crawler-data-processor.ts
git add apps/crawler/src/cli.ts
git commit -m "fix: 爬虫日志记录添加 categoryId 支持"
```

---

## Task 7: 确保类目数据初始化

**Files:**

- Modify: `package.json` (根目录)

**Step 1: 在根目录 package.json 添加初始化脚本**

```json
{
  "scripts": {
    "db:seed:categories": "pnpm --filter @good-trending/database db:seed:categories"
  }
}
```

**Step 2: 测试类目初始化**

Run:

```bash
pnpm db:seed:categories
```

Expected: 成功导入 68 个类目

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: 添加类目初始化脚本"
```

---

## Task 8: 验证修复

**Step 1: 类型检查**

Run:

```bash
pnpm typecheck
```

Expected: 无类型错误

**Step 2: 构建项目**

Run:

```bash
pnpm build
```

Expected: 构建成功

**Step 3: 运行测试**

Run:

```bash
pnpm test
```

Expected: 所有测试通过

---

## 总结

修复完成后，系统将支持：

1. ✅ 类目热度统计表包含 yesterday 和 last7days 字段
2. ✅ Bitmap 更新逻辑正确检查商品今天是否出现
3. ✅ 昨天数据统计功能（凌晨2点自动执行）
4. ✅ 数据库迁移文件完整
5. ✅ 爬虫日志包含 categoryId
6. ✅ 类目数据可以正确初始化
