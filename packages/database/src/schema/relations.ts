import { relations } from "drizzle-orm";
import {
  products,
  productHistories,
  topics,
  productTopics,
  tags,
  productTags,
  trends,
} from "./tables";

// 商品关联关系
export const productsRelations = relations(products, ({ many }) => ({
  topics: many(productTopics),
  tags: many(productTags),
  trends: many(trends),
  histories: many(productHistories),
}));

export const productHistoriesRelations = relations(productHistories, ({ one }) => ({
  product: one(products, {
    fields: [productHistories.productId],
    references: [products.id],
  }),
}));

// 分类关联关系
export const topicsRelations = relations(topics, ({ many }) => ({
  products: many(productTopics),
}));

export const productTopicsRelations = relations(productTopics, ({ one }) => ({
  product: one(products, {
    fields: [productTopics.productId],
    references: [products.id],
  }),
  topic: one(topics, {
    fields: [productTopics.topicId],
    references: [topics.id],
  }),
}));

// 标签关联关系
export const tagsRelations = relations(tags, ({ many }) => ({
  products: many(productTags),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.productId],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tagId],
    references: [tags.id],
  }),
}));

// 趋势关联关系
export const trendsRelations = relations(trends, ({ one }) => ({
  product: one(products, {
    fields: [trends.productId],
    references: [products.id],
  }),
}));
