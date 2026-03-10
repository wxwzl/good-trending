# Next.js 16+ 缓存策略配置说明

本文档说明 Good-Trending Web 应用的缓存策略配置，基于 Next.js 16+ 的 `use cache` 模式。

## 配置概览

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  // 启用组件级缓存 (Next.js 16+ 特性)
  cacheComponents: true,
  // 启用 React Compiler 优化 (已稳定)
  reactCompiler: true,
  // ... 其他配置
};
```

**注意：** Next.js 16 已移除 `experimental.dynamicIO`，改为使用 `cacheComponents: true`。

## 缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                      页面层 (Page)                           │
│  • 使用带缓存的数据层函数                                    │
│  • 无需设置 export const revalidate                         │
├─────────────────────────────────────────────────────────────┤
│                     数据层 (lib/data.ts)                     │
│  • "use cache" 指令                                          │
│  • cacheLife() - 设置缓存生命周期                            │
│  • cacheTag() - 设置缓存标签用于失效                         │
├─────────────────────────────────────────────────────────────┤
│                   操作层 (lib/actions.ts)                    │
│  • revalidateTag() - stale-while-revalidate 失效             │
│  • updateTag() - 立即失效并刷新 (read-your-writes)           │
│  • refresh() - 刷新客户端路由                                │
└─────────────────────────────────────────────────────────────┘
```

## 缓存生命周期 (cacheLife)

| 预设值      | 说明             | 适用场景           |
| ----------- | ---------------- | ------------------ |
| `"max"`     | 尽可能长时间缓存 | 极少变化的数据     |
| `"hours"`   | 小时级缓存       | 分类列表、商品详情 |
| `"minutes"` | 分钟级缓存       | 热门趋势、搜索结果 |
| `"seconds"` | 秒级缓存         | 实时性要求高的数据 |
| `"default"` | 默认缓存时间     | 一般数据           |

## 缓存标签 (cacheTag)

用于精确控制缓存失效：

```typescript
// 标签常量定义
export const CACHE_TAGS = {
  TRENDING: "trending",
  TRENDING_DAILY: "trending:daily",
  TRENDING_WEEKLY: "trending:weekly",
  TRENDING_MONTHLY: "trending:monthly",
  TOPICS: "topics",
  TOPIC: (slug: string) => `topic:${slug}`,
  PRODUCTS: "products",
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_SLUG: (slug: string) => `product:slug:${slug}`,
  SEARCH: "search",
} as const;
```

## 数据获取函数缓存配置

### Trending 相关

| 函数                   | 缓存时间 | 标签                            |
| ---------------------- | -------- | ------------------------------- |
| `getTrendingList()`    | 5 分钟   | `trending`, `trending:{period}` |
| `getDailyTrending()`   | 5 分钟   | `trending`, `trending:daily`    |
| `getWeeklyTrending()`  | 10 分钟  | `trending`, `trending:weekly`   |
| `getMonthlyTrending()` | 30 分钟  | `trending`, `trending:monthly`  |
| `getTrendingByTopic()` | 5 分钟   | `trending`, `topic:{slug}`      |

### Topics 相关

| 函数                     | 缓存时间 | 标签                                 |
| ------------------------ | -------- | ------------------------------------ |
| `getTopicsList()`        | 1 小时   | `topics`                             |
| `getTopicBySlug()`       | 1 小时   | `topics`, `topic:{slug}`             |
| `getTopicProductsList()` | 10 分钟  | `topics`, `topic:{slug}`, `products` |

### Products 相关

| 函数                       | 缓存时间 | 标签                              |
| -------------------------- | -------- | --------------------------------- |
| `getProductsList()`        | 10 分钟  | `products`                        |
| `getProductById()`         | 1 小时   | `products`, `product:{id}`        |
| `getProductBySlugCached()` | 1 小时   | `products`, `product:slug:{slug}` |

### Search 相关

| 函数               | 缓存时间 | 标签                       |
| ------------------ | -------- | -------------------------- |
| `searchProducts()` | 5 分钟   | `search`, `search:{query}` |

## 缓存失效策略

### revalidateTag (stale-while-revalidate)

用户继续看到旧数据，后台异步刷新：

```typescript
// 使所有热门趋势缓存失效
revalidateTag(CACHE_TAGS.TRENDING, "max");

// 使特定分类缓存失效
revalidateTag(CACHE_TAGS.TOPIC(slug), "max");
```

### updateTag (read-your-writes)

用户立即看到最新数据（适合表单提交）：

```typescript
// 立即更新特定商品缓存
updateTag(CACHE_TAGS.PRODUCT(id));

// 立即更新特定分类缓存
updateTag(CACHE_TAGS.TOPIC(slug));
```

## 使用示例

### 在页面中使用带缓存的数据

```typescript
// app/[locale]/trending/page.tsx
import { getTrendingList } from "@/lib/data";

export default async function TrendingPage() {
  // 自动使用缓存，无需设置 revalidate
  const trendingData = await getTrendingList({ period: "daily" });

  return <TrendingList data={trendingData} />;
}
```

### 在 Server Action 中刷新缓存

```typescript
// 提交表单后刷新缓存
"use server";

import { updateTag, refresh } from "next/cache";

export async function updateProduct(formData: FormData) {
  // 更新数据库
  await db.products.update(...);

  // 立即使缓存失效
  updateTag(`product:${productId}`);

  // 刷新客户端路由
  refresh();
}
```

## 最佳实践

1. **默认使用缓存**：所有数据获取函数都应该使用 `"use cache"`
2. **合理设置生命周期**：根据数据变化频率选择合适的 `cacheLife`
3. **使用标签管理**：为不同类型的数据设置不同的 `cacheTag`，便于精确失效
4. **区分更新策略**：
   - 后台数据更新使用 `revalidateTag`（用户看到旧数据，后台刷新）
   - 用户交互更新使用 `updateTag`（用户立即看到新数据）
5. **不要混用**：使用 `use cache` 模式后，不再需要页面级的 `export const revalidate`

## 调试

查看缓存是否生效：

1. 在开发模式下，查看 Network 标签页中的请求
2. 相同参数的请求应该只发送一次
3. 在服务端日志中查看数据获取函数的调用频率

## 参考文档

- [Next.js 16 Caching](https://nextjs.org/docs/app/guides/caching)
- [cacheLife API](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [cacheTag API](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [revalidateTag API](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [updateTag API](https://nextjs.org/docs/app/api-reference/functions/updateTag)
