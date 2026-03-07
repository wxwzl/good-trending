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
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ==================== 枚举 ====================

export const sourceTypeEnum = pgEnum("source_type", ["X_PLATFORM", "AMAZON"]);
export const crawlerStatusEnum = pgEnum("crawler_status", ["RUNNING", "COMPLETED", "FAILED"]);

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
    image: text("image"),
    price: decimal("price", { precision: 10, scale: 2 }),
    currency: text("currency").default("USD").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceId: text("source_id").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_source_idx").on(table.sourceType, table.sourceId),
    index("product_created_at_idx").on(table.createdAt),
    index("product_slug_idx").on(table.slug),
    uniqueIndex("product_source_type_id_unique").on(table.sourceType, table.sourceId),
    uniqueIndex("product_source_type_url_unique").on(table.sourceType, table.sourceUrl),
  ]
);

export const productHistories = pgTable(
  "product_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }),
    rank: integer("rank"),
    salesCount: integer("sales_count"),
    reviewCount: integer("review_count"),
    rating: real("rating"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_history_product_date_idx").on(table.productId, table.date)]
);

// ==================== 分类表 ====================

export const topics = pgTable(
  "topic",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").unique().notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("topic_slug_idx").on(table.slug)]
);

export const productTopics = pgTable(
  "product_topic",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.topicId] })]
);

// ==================== 标签表 ====================

export const tags = pgTable(
  "tag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").unique().notNull(),
    slug: text("slug").unique().notNull(),
  },
  (table) => [index("tag_slug_idx").on(table.slug)]
);

export const productTags = pgTable(
  "product_tag",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.productId, table.tagId] })]
);

// ==================== 趋势表 ====================

export const trends = pgTable(
  "trend",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    rank: integer("rank").notNull(),
    score: real("score").notNull(),
    mentions: integer("mentions").default(0).notNull(),
    views: integer("views").default(0).notNull(),
    likes: integer("likes").default(0).notNull(),
    sourceData: json("source_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("trend_product_date_idx").on(table.productId, table.date),
    index("trend_date_rank_idx").on(table.date, table.rank),
    index("trend_date_score_idx").on(table.date, table.score),
  ]
);

// ==================== 爬虫日志表 ====================

export const crawlerLogs = pgTable(
  "crawler_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    sourceType: sourceTypeEnum("source_type").notNull(),
    status: crawlerStatusEnum("status").notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    duration: integer("duration"),
    itemsFound: integer("items_found").default(0).notNull(),
    itemsSaved: integer("items_saved").default(0).notNull(),
    errors: json("errors"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("crawler_log_source_created_idx").on(table.sourceType, table.createdAt)]
);
