# Web 前端开发规范

> 本文档定义了 Good-Trending 前端项目的开发规范。适用于 Next.js + React + Tailwind CSS 技术栈,采用APP Router,注意区分Page Router的api，要采用最新的next16版本的api,缓存api采用cache-component 一套api。

---

## 目录

1. [Next.js 16+ 最佳实践](#1-nextjs-16-最佳实践)
2. [前端开发流程](#2-前端开发流程)
3. [组件规范](#3-组件规范)
4. [国际化规范](#4-国际化规范)

---

## 1. Next.js 16+ 最佳实践

### 1.1 Server Components（默认）

```tsx
// ✅ 默认使用 Server Component，可直接访问数据库
async function ProductList() {
  const products = await getProducts(); // 服务端直接获取
  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### 1.2 Client Components（按需使用）

```tsx
// 仅在需要交互时使用 'use client'
"use client";

import { useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

### 1.3 并行数据获取

```tsx
// ✅ 推荐：并行获取
async function Page() {
  const [products, topics] = await Promise.all([getProducts(), getTopics()]);
  return <Dashboard products={products} topics={topics} />;
}

// ❌ 避免：串行获取
async function Page() {
  const products = await getProducts();
  const topics = await getTopics(); // 等待 products 完成
  // ...
}
```

### 1.4 流式渲染

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <h1>Trending Products</h1>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  );
}
```

### 1.5 尽量用语义化的标签来实现，让seo达到最优。

---

## 2. 前端开发流程

### 2.1 阶段 1: 设计理念 & UX

使用 `/ui-ux-pro-max` skill：

- 设计配色体系
- 定义主题规范（明暗模式）
- 确定 UI 组件规范
- 设计响应式断点

### 2.2 阶段 2: 美感 & 视觉

使用 `/frontend-design` skill：

- 基于配色体系生成响应式布局设计
- 考虑移动端适配
- 设计组件层级结构

### 2.3 阶段 3: Next.js 实现

使用 `/nextjs-best-practices` 和`/react-best-practices`skill：

- 将设计转化为 Next.js 16 + React 19 代码
- 遵循 App Router 最佳实践
- 实现国际化路由 (`[locale]`)
- 配置 SEO 元数据

---

### 2.4 阶段 4：自测

启动开发服务器,用chrome-devtools mcp 用浏览器访问项目的所有页面并查看每一个页面的控制台是否有报错。

## 3. 组件规范

### 3.1 目录结构

```
components/
├── ui/                    # 基础 UI 组件
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── layout/                # 布局组件
│   ├── header.tsx         # Server Component
│   ├── footer.tsx         # Server Component
│   └── sidebar.tsx
├── providers/             # Context Providers
│   └── theme-provider.tsx # Client Component
└── features/              # 功能组件
    ├── product-card.tsx
    ├── trending-list.tsx
    └── topic-filter.tsx
```

### 3.2 命名规范

| 类型       | 命名规则                | 示例               |
| ---------- | ----------------------- | ------------------ |
| 组件文件   | `kebab-case.tsx`        | `product-card.tsx` |
| 组件名称   | `PascalCase`            | `ProductCard`      |
| Props 接口 | `${ComponentName}Props` | `ProductCardProps` |
| Hooks 文件 | `use-${feature}.ts`     | `use-products.ts`  |
| 工具函数   | `camelCase`             | `formatPrice`      |

---

## 4. 国际化规范

### 4.1 文件组织

```
messages/
├── en.json    # 英文翻译
└── zh.json    # 中文翻译
```

### 4.2 翻译 Key 命名

```json
{
  "navigation.home": "Home",
  "navigation.trending": "Trending",
  "home.title": "Discover What's Trending",
  "product.price": "Price: {price}"
}
```

---

## 5. API 类型规范

### 5.1 使用 @good-trending/dto 包

**所有 API 请求参数和响应参数类型必须使用 `@good-trending/dto` 包中定义的类型，禁止在项目中重复定义。**

```typescript
// ✅ 正确：从 @good-trending/dto 导入类型
import type {
  ProductResponse,
  PaginatedProductsResponse,
  GetProductsRequest,
} from "@good-trending/dto";

async function getProducts(params: GetProductsRequest): Promise<PaginatedProductsResponse> {
  const response = await fetchApi<PaginatedProductsResponse>("/products", {
    params,
  });
  return response;
}

// ❌ 错误：在项目中重复定义 API 类型
interface Product {
  id: string;
  name: string;
  // ...
}

interface GetProductsParams {
  page?: number;
  limit?: number;
  // ...
}
```

### 5.2 类型导入路径

`@good-trending/dto` 包提供以下子路径导出：

| 子路径                        | 说明                         | 示例                                                                   |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `@good-trending/dto`          | 主入口，导出所有类型         | `import type { ProductResponse } from "@good-trending/dto"`            |
| `@good-trending/dto/common`   | 公共类型（枚举、分页参数等） | `import { SourceType, Period } from "@good-trending/dto/common"`       |
| `@good-trending/dto/request`  | 请求参数类型                 | `import type { GetProductsRequest } from "@good-trending/dto/request"` |
| `@good-trending/dto/response` | 响应数据类型                 | `import type { ProductResponse } from "@good-trending/dto/response"`   |

### 5.3 类型复用与别名

如需为类型创建别名以保持向后兼容，使用 `type` 导出：

```typescript
// src/api/types.ts
// 统一从 dto 包重新导出类型，供项目内部使用
export type {
  ProductResponse,
  PaginatedProductsResponse,
  // ...
} from "@good-trending/dto/response";

// 向后兼容的别名
export type { ProductResponse as Product } from "@good-trending/dto/response";
```

---

## 参考

- [项目代码宪法](../../CLAUDE.md)
- [API 开发规范](../api/CLAUDE.md)
- [测试规范](../tests/CLAUDE.md)

---

_最后更新: 2026-03-07_
