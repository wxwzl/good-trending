# Next.js 模块化项目结构

本文档描述了 Good-Trending Web 应用的模块化项目结构，基于 Next.js 15+ 的 **Colocation** 最佳实践和 NestJS 的模块化思想。

## 目录结构

```
apps/web/src/
├── app/[locale]/                    # App Router 路由
│   ├── trending/                    # 热门模块
│   │   ├── page.tsx                 # 页面入口
│   │   ├── _components/             # 模块私有组件
│   │   │   ├── trending-container.tsx
│   │   │   ├── trending-list.tsx
│   │   │   ├── trending-filters.tsx
│   │   │   └── index.ts             # 统一导出
│   │   └── _hooks/                  # 模块私有 hooks（可选）
│   │
│   ├── topics/                      # 分类模块
│   │   ├── page.tsx
│   │   ├── [slug]/                  # 动态路由
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   └── _components/
│   │
│   ├── product/                     # 产品模块
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       └── _components/
│   │
│   ├── (marketing)/                 # 路由组：营销页面
│   │   └── about/
│   │
│   ├── layout.tsx                   # 根布局
│   └── page.tsx                     # 首页
│
├── components/                      # 全局共享组件
│   ├── ui/                          # 基础 UI 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                      # 布局组件
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── sidebar.tsx
│   ├── features/                    # 跨模块共享的业务组件
│   │   ├── product-card.tsx         # 产品卡片（在多个页面使用）
│   │   ├── topic-card.tsx           # 分类卡片
│   │   └── search-bar.tsx           # 搜索栏
│   ├── seo/                         # SEO 组件
│   └── providers/                   # Context Providers
│
├── lib/                             # 全局工具函数
│   ├── fetch.ts                     # HTTP 客户端
│   ├── cache.ts                     # 缓存工具
│   ├── cache-tags.ts                # 缓存标签
│   ├── utils.ts                     # 通用工具
│   └── seo.ts                       # SEO 工具
│
├── api/                             # API 客户端
│   ├── trending.ts
│   ├── topics.ts
│   ├── product.ts
│   └── search.ts
│
├── hooks/                           # 全局共享 hooks
│   └── use-locale.ts
│
├── i18n/                            # 国际化配置
│   ├── config.ts
│   ├── request.ts
│   └── routing.ts
│
└── messages/                        # 翻译文件
    ├── en.json
    └── zh.json
```

## 核心原则

### 1. Colocation（同地协作）

将相关的文件放在一起，靠近使用它们的地方。

```
❌ 不推荐
components/features/trending-list.tsx
app/[locale]/trending/page.tsx

✅ 推荐
app/[locale]/trending/
├── page.tsx
└── _components/
    ├── trending-list.tsx
    ├── trending-container.tsx
    └── trending-filters.tsx
```

### 2. Private Folders（私有文件夹）

使用 `_` 前缀表示文件夹是私有的，不会被路由系统处理。

```
app/[locale]/trending/
├── page.tsx              # 公开路由
├── _components/          # 私有组件（不可路由）
├── _hooks/               # 私有 hooks
├── _utils/               # 私有工具函数
└── _types/               # 私有类型定义
```

### 3. 共享层级

根据使用范围决定组件位置：

| 范围       | 位置                      | 示例                          |
| ---------- | ------------------------- | ----------------------------- |
| 全局共享   | `components/ui/`          | Button, Card, Input           |
| 跨模块共享 | `components/features/`    | ProductCard, TopicCard        |
| 模块私有   | `app/[page]/_components/` | TrendingList, TrendingFilters |

### 4. 统一导出

每个 `_components` 目录应有一个 `index.ts` 统一导出：

```typescript
// app/[locale]/trending/_components/index.ts
export { TrendingContainer } from "./trending-container";
export { TrendingFilters } from "./trending-filters";
export { TrendingList } from "./trending-list";
```

页面导入时使用：

```typescript
import { TrendingContainer } from "./_components";
```

## 迁移指南

### 从旧结构迁移到新结构

#### 步骤 1：识别模块

确定哪些组件属于哪个页面模块。

```
components/features/
├── trending-container.tsx    → app/[locale]/trending/_components/
├── trending-list.tsx         → app/[locale]/trending/_components/
├── trending-filters.tsx      → app/[locale]/trending/_components/
├── topic-products-list.tsx   → app/[locale]/topics/_components/
├── product-card.tsx          → 保留在 components/features/（跨模块共享）
├── topic-card.tsx            → 保留在 components/features/（跨模块共享）
└── search-bar.tsx            → 保留在 components/features/（跨模块共享）
```

#### 步骤 2：移动文件

1. 在页面目录下创建 `_components` 文件夹
2. 将组件文件移动到新位置
3. 更新导入路径

```typescript
// 旧导入（在 components/features/trending-list.tsx）
import { ProductCard } from "./product-card";

// 新导入（在 app/[locale]/trending/_components/trending-list.tsx）
import { ProductCard } from "@/components/features/product-card";
```

#### 步骤 3：创建统一导出

```typescript
// app/[locale]/trending/_components/index.ts
export { TrendingContainer } from "./trending-container";
export { TrendingFilters } from "./trending-filters";
export { TrendingList } from "./trending-list";
```

#### 步骤 4：更新页面导入

```typescript
// 旧导入
import { TrendingContainer } from "@/components/features/trending-container";

// 新导入
import { TrendingContainer } from "./_components";
```

#### 步骤 5：清理旧文件

删除 `components/features/` 中已迁移的文件，并更新 `index.ts`。

## 最佳实践

### 组件分类决策树

```
新组件应该放在哪里？
│
├─ 是否为基础 UI 组件？
│  └─ 是 → components/ui/
│
├─ 是否在多个页面模块中使用？
│  └─ 是 → components/features/
│
└─ 是否只在单个页面中使用？
   └─ 是 → app/[locale]/[page]/_components/
```

### 导入路径规范

```typescript
// ✅ 使用绝对路径导入全局模块
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/fetch";

// ✅ 使用相对路径导入模块内组件
import { TrendingList } from "./trending-list";
import { TrendingContainer } from "./_components";

// ❌ 避免深层相对路径
import { Button } from "../../../../components/ui/button";
```

### 模块结构示例

```
app/[locale]/product/
└── [slug]/
    ├── page.tsx                    # 页面
    ├── _components/
    │   ├── product-detail.tsx      # 产品详情
    │   ├── product-images.tsx      # 图片展示
    │   ├── product-actions.tsx     # 操作按钮
    │   └── index.ts                # 统一导出
    ├── _hooks/
    │   └── use-product.ts          # 产品数据 hook
    ├── _utils/
    │   └── format-price.ts         # 价格格式化
    └── _types/
        └── product.ts              # 产品类型定义
```

## 优势

### 1. 代码组织更清晰

- 相关文件放在一起，易于查找
- 模块边界清晰

### 2. 维护性更好

- 修改某个页面功能时，只需关注该页面目录
- 不用担心影响其他模块

### 3. 代码复用更合理

- 全局共享放在 `components/`
- 模块私有放在 `_components/`
- 避免过度耦合

### 4. 符合 Next.js 理念

- 使用官方推荐的 Colocation 模式
- 利用 Private Folders 特性
- 与 App Router 完美配合

## 参考

- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js Colocation](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [NestJS Modular Architecture](https://docs.nestjs.com/modules)
