/**
 * 缓存标签常量
 * 可在 Server 和 Client 组件中安全导入
 */

export const CACHE_TAGS = {
  // 热门相关
  TRENDING: "trending",
  TRENDING_DAILY: "trending:daily",
  TRENDING_WEEKLY: "trending:weekly",
  TRENDING_MONTHLY: "trending:monthly",

  // 分类相关
  TOPICS: "topics",
  TOPIC: (slug: string) => `topic:${slug}`,
  TOPIC_PRODUCTS: (slug: string) => `topic:${slug}:products`,

  // 产品相关
  PRODUCTS: "products",
  PRODUCT: (id: string) => `product:${id}`,

  // 搜索相关
  SEARCH: "search",
} as const;
