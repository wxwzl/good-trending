import { relations } from "drizzle-orm";
import {
  products,
  categories,
  productCategories,
  categoryHeatStats,
  productAppearanceStats,
  productSocialStats,
  trendRanks,
  crawlerLogs,
} from "./tables";

// ==================== 类目关系 ====================

export const categoriesRelations = relations(categories, ({ many }) =>> ({
  heatStats: many(categoryHeatStats),
  productCategories: many(productCategories),
  crawlerLogs: many(crawlerLogs),
}));

export const categoryHeatStatsRelations = relations(categoryHeatStats, ({ one }) => ({
  category: one(categories, {
    fields: [categoryHeatStats.categoryId],
    references: [categories.id],
  }),
}));

// ==================== 商品关系 ====================

export const productsRelations = relations(products, ({ many, one }) => ({
  productCategories: many(productCategories),
  appearanceStats: one(productAppearanceStats, {
    fields: [products.id],
    references: [productAppearanceStats.productId],
  }),
  socialStats: many(productSocialStats),
  trendRanks: many(trendRanks),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

// ==================== 商品统计关系 ====================

export const productAppearanceStatsRelations = relations(productAppearanceStats, ({ one }) => ({
  product: one(products, {
    fields: [productAppearanceStats.productId],
    references: [products.id],
  }),
}));

export const productSocialStatsRelations = relations(productSocialStats, ({ one }) => ({
  product: one(products, {
    fields: [productSocialStats.productId],
    references: [products.id],
  }),
}));

// ==================== 趋势榜单关系 ====================

export const trendRanksRelations = relations(trendRanks, ({ one }) => ({
  product: one(products, {
    fields: [trendRanks.productId],
    references: [products.id],
  }),
}));

// ==================== 爬虫日志关系 ====================

export const crawlerLogsRelations = relations(crawlerLogs, ({ one }) => ({
  category: one(categories, {
    fields: [crawlerLogs.categoryId],
    references: [categories.id],
  }),
}));
