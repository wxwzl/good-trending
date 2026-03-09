import {
  pgTable,
  pgEnum,
  text,
  decimal,
  timestamp,
  integer,
  real,
  json,
  date,
  uniqueIndex,
  index,
  primaryKey,
  bigint,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ==================== 枚举 ====================

// 数据来源平台枚举
export const sourceTypeEnum = pgEnum("source_type", ["REDDIT", "X_PLATFORM", "AMAZON"]);

// 导出类型
export type SourceType = "REDDIT" | "X_PLATFORM" | "AMAZON";

// 爬虫状态枚举
export const crawlerStatusEnum = pgEnum("crawler_status", ["RUNNING", "COMPLETED", "FAILED"]);

// ==================== 类目表 (原 topic 表) ====================

export const categories = pgTable(
  "category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").unique().notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    // 搜索关键词（用于 Google 搜索）
    searchKeywords: text("search_keywords"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("category_slug_idx").on(table.slug)]
);

// ==================== 类目热度统计表 ====================
// 记录每个类目每天的 Google 搜索结果总数

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

// ==================== 商品表 ====================

export const products = pgTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    // 商品主图
    image: text("image"),
    // 商品价格
    price: decimal("price", { precision: 10, scale: 2 }),
    currency: text("currency").default("USD").notNull(),
    // 亚马逊商品 ID (ASIN)
    amazonId: text("amazon_id").unique(),
    // 商品链接
    sourceUrl: text("source_url").notNull(),
    // 数据来源类型（从哪里发现的）
    discoveredFrom: sourceTypeEnum("discovered_from").notNull(),
    // 首次发现的日期
    firstSeenAt: date("first_seen_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_slug_idx").on(table.slug),
    index("product_first_seen_idx").on(table.firstSeenAt),
    uniqueIndex("product_source_url_unique").on(table.sourceUrl),
  ]
);

// ==================== 商品与类目关联表 ====================

export const productCategories = pgTable(
  "product_category",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.categoryId] })]
);

// ==================== 商品出现统计表 (使用 Bitmap) ====================
// 使用 BigInt 存储近 7/15/30/60 天的出现位图
// 每一位代表某一天是否出现 (1=出现, 0=未出现)

export const productAppearanceStats = pgTable(
  "product_appearance_stat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" })
      .unique(),
    // 近7天出现位图 (7位，每天左移)
    last7DaysBitmap: bigint("last_7_days_bitmap", { mode: "number" }).default(0).notNull(),
    // 近15天出现位图 (15位)
    last15DaysBitmap: bigint("last_15_days_bitmap", { mode: "number" }).default(0).notNull(),
    // 近30天出现位图 (30位)
    last30DaysBitmap: bigint("last_30_days_bitmap", { mode: "number" }).default(0).notNull(),
    // 近60天出现位图 (60位)
    last60DaysBitmap: bigint("last_60_days_bitmap", { mode: "number" }).default(0).notNull(),
    // 上一次更新时间（用于滑动窗口计算）
    lastUpdateDate: date("last_update_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("appearance_product_idx").on(table.productId)]
);

// ==================== 商品社交提及统计表 ====================
// 记录商品在各时间段 Reddit/X 平台的搜索结果数

export const productSocialStats = pgTable(
  "product_social_stat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull(),

    // 今日数据
    todayRedditCount: integer("today_reddit_count").default(0).notNull(),
    todayXCount: integer("today_x_count").default(0).notNull(),

    // 昨日数据
    yesterdayRedditCount: integer("yesterday_reddit_count").default(0).notNull(),
    yesterdayXCount: integer("yesterday_x_count").default(0).notNull(),

    // 本周数据（周一到统计日）
    thisWeekRedditCount: integer("this_week_reddit_count").default(0).notNull(),
    thisWeekXCount: integer("this_week_x_count").default(0).notNull(),

    // 本月数据（1号到统计日）
    thisMonthRedditCount: integer("this_month_reddit_count").default(0).notNull(),
    thisMonthXCount: integer("this_month_x_count").default(0).notNull(),

    // 近7天数据
    last7DaysRedditCount: integer("last_7_days_reddit_count").default(0).notNull(),
    last7DaysXCount: integer("last_7_days_x_count").default(0).notNull(),

    // 近15天数据
    last15DaysRedditCount: integer("last_15_days_reddit_count").default(0).notNull(),
    last15DaysXCount: integer("last_15_days_x_count").default(0).notNull(),

    // 近30天数据
    last30DaysRedditCount: integer("last_30_days_reddit_count").default(0).notNull(),
    last30DaysXCount: integer("last_30_days_x_count").default(0).notNull(),

    // 近60天数据
    last60DaysRedditCount: integer("last_60_days_reddit_count").default(0).notNull(),
    last60DaysXCount: integer("last_60_days_x_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("social_stat_product_date_idx").on(table.productId, table.statDate),
    index("social_stat_date_idx").on(table.statDate),
  ]
);

// ==================== 趋势榜单表 ====================
// 基于社交提及数据计算的每日/昨日/本周/本月趋势榜单

export const trendRanks = pgTable(
  "trend_rank",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // 榜单类型: TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, LAST_7_DAYS, LAST_15_DAYS, LAST_30_DAYS
    periodType: text("period_type").notNull(),
    // 统计日期
    statDate: date("stat_date").notNull(),
    // 排名
    rank: integer("rank").notNull(),
    // 趋势分数（基于 Reddit + X 提及数计算）
    score: real("score").notNull(),
    // Reddit 提及数
    redditMentions: integer("reddit_mentions").default(0).notNull(),
    // X 提及数
    xMentions: integer("x_mentions").default(0).notNull(),
    // 原始数据
    sourceData: json("source_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trend_rank_product_period_date_idx").on(
      table.productId,
      table.periodType,
      table.statDate
    ),
    index("trend_rank_period_date_rank_idx").on(table.periodType, table.statDate, table.rank),
    index("trend_rank_date_score_idx").on(table.statDate, table.score),
  ]
);

// ==================== 爬虫日志表 ====================

export const crawlerLogs = pgTable(
  "crawler_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    // 爬虫任务类型: CATEGORY_HEAT, PRODUCT_DISCOVERY, PRODUCT_MENTION
    taskType: text("task_type").notNull(),
    // 数据来源平台
    sourceType: sourceTypeEnum("source_type").notNull(),
    // 关联的类目ID（如果有）
    categoryId: text("category_id"),
    // 爬虫状态
    status: crawlerStatusEnum("status").notNull(),
    // 开始时间
    startTime: timestamp("start_time").notNull(),
    // 结束时间
    endTime: timestamp("end_time"),
    // 执行时长（秒）
    duration: integer("duration"),
    // 找到的商品/结果数量
    itemsFound: integer("items_found").default(0).notNull(),
    // 成功保存的数量
    itemsSaved: integer("items_saved").default(0).notNull(),
    // 错误信息
    errors: json("errors"),
    // 元数据（搜索关键词、日期范围等）
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("crawler_log_task_source_created_idx").on(
      table.taskType,
      table.sourceType,
      table.createdAt
    ),
    index("crawler_log_status_idx").on(table.status),
    index("crawler_log_category_idx").on(table.categoryId),
  ]
);
