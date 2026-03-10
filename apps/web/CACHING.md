# Web 缓存策略文档

本文档描述了 Good-Trending Web 应用的缓存配置和最佳实践。

## 概述

本项目采用 **Next.js 16** 的缓存机制，结合 **fetch 级别的缓存策略** 实现高效的数据获取和页面渲染。

## 缓存架构

### 1. 数据层缓存（API 请求缓存）

使用 `fetch` 的 `next.revalidate` 和 `next.tags` 实现细粒度的数据缓存控制。

```typescript
// lib/fetch.ts
export interface FetchOptions extends RequestInit {
  locale?: string;
  next?: {
    revalidate?: number; // 重新验证间隔（秒）
    tags?: string[]; // 缓存标签，用于按需失效
  };
}
```

### 2. 页面层缓存（ISR）

使用 `export const revalidate = N` 实现增量静态生成（ISR）。

| 页面                       | 缓存时间 | 说明                       |
| -------------------------- | -------- | -------------------------- |
| `/[locale]` (首页)         | 5分钟    | 动态渲染，热门数据更新频繁 |
| `/[locale]/trending`       | 5分钟    | 热门趋势数据               |
| `/[locale]/topics`         | 1小时    | 分类数据相对稳定           |
| `/[locale]/topics/[slug]`  | 5分钟    | 分类详情页                 |
| `/[locale]/product/[slug]` | 1小时    | 产品详情页                 |
| `/[locale]/search`         | 动态     | 搜索页实时渲染             |

### 3. 缓存标签系统

定义统一的缓存标签，便于按需失效：

```typescript
// lib/cache-tags.ts
export const CACHE_TAGS = {
  TRENDING: "trending",
  TRENDING_DAILY: "trending:daily",
  TRENDING_WEEKLY: "trending:weekly",
  TRENDING_MONTHLY: "trending:monthly",
  TOPICS: "topics",
  TOPIC: (slug: string) => `topic:${slug}`,
  TOPIC_PRODUCTS: (slug: string) => `topic:${slug}:products`,
  PRODUCTS: "products",
  PRODUCT: (id: string) => `product:${id}`,
  SEARCH: "search",
};
```

## API 缓存配置

### Trending API

```typescript
// api/trending.ts
export async function listTrending(params) {
  return fetchApi(`/trending?${searchParams}`, {
    next: {
      revalidate: 300, // 5分钟
      tags: [CACHE_TAGS.TRENDING, `${CACHE_TAGS.TRENDING}:${period}`],
    },
  });
}
```

### Topic API

```typescript
// api/topic.ts
export async function listTopics(params) {
  return fetchApi(`/topics?${searchParams}`, {
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.TOPICS],
    },
  });
}

export async function getTopic(slug) {
  return fetchApi(`/topics/${slug}`, {
    next: {
      revalidate: 3600,
      tags: [CACHE_TAGS.TOPICS, CACHE_TAGS.TOPIC(slug)],
    },
  });
}
```

### Product API

```typescript
// api/product.ts
export async function getProduct(id) {
  return fetchApi(`/products/${id}`, {
    next: {
      revalidate: 3600, // 1小时
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(id)],
    },
  });
}
```

## 缓存失效策略

### 按需失效（Server Actions）

```typescript
// lib/cache.ts
export async function invalidateTrendingCache(period?: string) {
  "use server";
  if (period) {
    revalidateTag(`${CACHE_TAGS.TRENDING}:${period}`, "trending");
  } else {
    revalidateTag(CACHE_TAGS.TRENDING, "trending");
  }
}

export async function invalidateProductCache(id?: string) {
  "use server";
  if (id) {
    revalidateTag(CACHE_TAGS.PRODUCT(id), "product");
  }
  revalidateTag(CACHE_TAGS.PRODUCTS, "product");
}
```

### 使用示例

```typescript
// app/actions.ts
"use server";

import { invalidateProductCache } from "@/lib/cache";

export async function updateProduct(formData: FormData) {
  // 更新数据库...
  await db.product.update({ ... });

  // 重新验证缓存
  await invalidateProductCache(productId);
}
```

## 缓存决策矩阵

| 数据类型 | 更新频率 | 缓存时间 | 标签策略                        |
| -------- | -------- | -------- | ------------------------------- |
| 热门趋势 | 高       | 5分钟    | `trending`, `trending:{period}` |
| 分类列表 | 低       | 1小时    | `topics`                        |
| 分类详情 | 低       | 1小时    | `topics`, `topic:{slug}`        |
| 产品列表 | 中       | 5分钟    | `topic:{slug}:products`         |
| 产品详情 | 低       | 1小时    | `products`, `product:{id}`      |
| 搜索结果 | 高       | 无缓存   | -                               |

## 验证缓存

### 响应头检查

```bash
# 检查首页缓存
curl -s "http://localhost:3010/en" -I | grep x-nextjs-cache
# 输出: x-nextjs-cache: HIT

# 检查热门页缓存
curl -s "http://localhost:3010/en/trending" -I | grep x-nextjs-cache
# 输出: x-nextjs-cache: HIT
```

### 开发环境日志

在开发环境中，Next.js 会输出缓存相关的调试信息：

```
▲ Next.js 16.1.6 (Turbopack)
...
Route (app)                     Revalidate  Expire
┌ ○ /
├ ● /[locale]/topics                    1h      1y
├ ● /[locale]/topics/[slug]             5m      1y
```

## 注意事项

1. **cacheComponents: true**：Next.js 16 提供了实验性的 `cacheComponents` 配置，但与本项目当前代码结构不完全兼容（需要大量重构 Client Components 以支持 Suspense 边界）。当前采用 fetch 级别的缓存策略作为替代方案。

2. **动态渲染页面**：使用 `searchParams` 的页面（如搜索页）自动使用动态渲染，无法缓存页面本身，但 API 请求仍然可以缓存。

3. **缓存标签粒度**：建议为不同类型的数据设置独立的缓存标签，以便精确控制失效范围。

4. **重新验证时间**：根据数据更新频率合理设置 `revalidate` 时间，避免过于频繁的重新验证。

## 相关文件

- `next.config.ts` - Next.js 配置
- `lib/fetch.ts` - HTTP 客户端和缓存配置
- `lib/cache-tags.ts` - 缓存标签常量
- `lib/cache.ts` - 缓存失效工具函数
- `api/*.ts` - API 层缓存配置

## 参考

- [Next.js Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
