---
name: nextjs-best-practices
description: Next.js 16+ App Router 最佳实践指南。提供从项目初始化、路由管理、Server/Client Components、数据获取到缓存策略的全面指导。基于官方文档 (https://nextjs.org/docs/app/getting-started)。适用于创建 Next.js 项目、开发 Next.js 应用、优化性能、解决架构问题。
---

# Next.js 16+ 最佳实践 Skill

## 🎯 Skill 触发方式

当检测到以下关键词时，自动激活此 Skill：

- `next.js` / `nextjs` / `next`
- `app router` / `app directory`
- `server component` / `client component`
- `next.js 项目` / `创建 next 应用`
- `next layout` / `next page`
- `next 数据获取` / `next 缓存`
- `use server` / `use client`

## 📚 核心内容

### 1. 项目初始化和配置

**推荐的项目创建方式：**

```bash
pnpm create next-app@latest my-app
# 或使用默认配置快速创建
pnpm create next-app@latest my-app --yes
```

**默认配置包括：**

- TypeScript
- Tailwind CSS
- ESLint
- App Router
- Turbopack（默认打包工具）
- 导入别名 `@/*`

**系统要求：**

- Node.js 20.9+
- React 19+
- Next.js 16+

### 2. 项目结构最佳实践

**推荐使用 App Router 目录结构：**

```
app/
├── layout.tsx          # Root Layout（必需）
├── page.tsx            # 首页
├── blog/
│   ├── layout.tsx      # 博客布局
│   ├── page.tsx        # 博客列表
│   ├── [slug]/
│   │   └── page.tsx    # 博客详情
│   ├── _components/    # 私有组件
│   └── _lib/           # 私有工具
├── (marketing)/        # 路由组（不影响 URL）
│   ├── about/
│   │   └── page.tsx    # /about
│   └── contact/
│       └── page.tsx    # /contact
└── api/
    └── route.ts        # API 路由
```

**关键原则：**

- 使用 `_folder` 创建私有文件夹
- 使用 `(group)` 创建路由组而不影响 URL
- 在 `app` 目录内安全地共置项目文件

### 3. Server 和 Client Components 策略

**默认使用 Server Components，仅在需要时使用 Client Components。**

**使用 Server Components 当：**

- 直接访问数据库或 API
- 使用 API 密钥、令牌等敏感信息
- 需要减少客户端 JavaScript
- 改善首次内容绘制 (FCP)

**使用 Client Components 当：**

- 需要状态和事件处理器（`onClick`, `onChange`）
- 需要生命周期逻辑（`useEffect`）
- 需要浏览器专用 API（`localStorage`, `window`）
- 使用自定义 hooks

**创建 Client Component：**

```tsx
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>{count} likes</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}
```

**组合模式：**

```tsx
// Server Component (Layout)
import Search from "./search"; // Client Component

export default function Layout({ children }) {
  return (
    <>
      <nav>
        <Logo />
        <Search /> {/* 仅 Search 是 Client Component */}
      </nav>
      <main>{children}</main>
    </>
  );
}
```

### 4. 数据获取最佳实践

**Server Components 中获取数据：**

```tsx
// Next.js 15+ fetch 默认行为：
// - 动态渲染: 每次请求都获取新数据
// - 静态渲染: 自动缓存到 Data Cache，输出缓存到 Full Route Cache

// 动态渲染示例 - 每次请求都获取新数据
export default async function Page() {
  const data = await fetch("https://api.example.com/data");
  return <PostList posts={await data.json()} />;
}

// 静态渲染示例 - 自动缓存
export const dynamic = "force-static";
export default async function Page() {
  const data = await fetch("https://api.example.com/data");
  return <PostList posts={await data.json()} />;
}

// 显式控制缓存
export default async function Page() {
  // 强制缓存（即使动态渲染也缓存）
  const data = await fetch("https://api.example.com/data", {
    cache: "force-cache",
  });

  // 定时重新验证 (ISR)
  const data2 = await fetch("https://api.example.com/data", {
    next: { revalidate: 3600 }, // 每小时重新验证
  });

  // 使用 "use cache" 指令缓存（推荐新方式）
  const data3 = await getCachedData();
}

// 使用 "use cache" 缓存函数
async function getCachedData() {
  "use cache";
  const data = await fetch("https://api.example.com/data");
  return data.json();
}
```

**并行数据获取（推荐）：**

```tsx
// ✅ 推荐：并行获取
export default async function Page() {
  const artistData = getArtist();
  const albumsData = getAlbums();

  const [artist, albums] = await Promise.all([artistData, albumsData]);
  return <ArtistView artist={artist} albums={albums} />;
}

// ❌ 避免：串行获取
export default async function Page() {
  const artist = await getArtist();
  const albums = await getAlbums(artist.id); // 等待 artist
  return <ArtistView artist={artist} albums={albums} />;
}
```

### 5. 缓存和重新验证

#### 5.1 四种缓存机制概览

| 机制                    | 缓存内容            | 位置   | 用途                   | 持续时间             |
| ----------------------- | ------------------- | ------ | ---------------------- | -------------------- |
| **Request Memoization** | 函数返回值          | Server | React 组件树内复用数据 | 单次请求生命周期     |
| **Data Cache**          | 数据                | Server | 跨请求和部署持久化     | 持久化（可重新验证） |
| **Full Route Cache**    | HTML 和 RSC payload | Server | 减少渲染开销           | 持久化（可重新验证） |
| **Router Cache**        | RSC Payload         | Client | 导航时减少服务器请求   | 会话或基于时间       |

#### 5.2 fetch 缓存选项

```tsx
// 动态渲染：默认每次都获取新数据
// 静态渲染：自动缓存到 Data Cache
const data = await fetch("https://...");

// 显式不缓存
await fetch("https://...", { cache: "no-store" });

// 强制缓存（即使动态渲染）
await fetch("https://...", { cache: "force-cache" });

// 定时重新验证 (ISR)
await fetch("https://...", { next: { revalidate: 3600 } });

// 基于标签的重新验证
await fetch("https://...", { next: { tags: ["users"] } });
```

#### 5.3 "use cache" 指令（Next.js 15+）

**启用配置：**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // 启用 Cache Components
};

export default nextConfig;
```

**使用方式：**

```tsx
// 文件级别 - 缓存文件中所有导出
"use cache";

export default async function Page() {
  const data = await fetch("/api/data");
  return <div>{data}</div>;
}

// 组件级别
export async function MyComponent() {
  "use cache";
  return <></>;
}

// 函数级别
export async function getData() {
  "use cache";
  const data = await fetch("/api/data");
  return data;
}
```

**重要约束：**

```tsx
// ❌ 错误：不能在 use cache 内直接访问运行时 API
async function CachedComponent() {
  "use cache";
  const cookieStore = cookies(); // 会报错
  return <div>...</div>;
}

// ✅ 正确：在缓存作用域外读取，作为参数传入
async function Page() {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;
  return <CachedComponent userId={userId} />;
}

async function CachedComponent({ userId }: { userId: string }) {
  "use cache";
  // 现在 userId 是序列化的参数，可以作为缓存 key 的一部分
  const data = await fetch(`/api/users/${userId}`);
  return <div>{data}</div>;
}
```

**序列化规则：**

- **参数可接受**：string, number, boolean, null, undefined, 纯对象, 数组, Date, Map, Set, TypedArrays
- **返回值可接受**：以上所有 + JSX 元素
- **不支持**：类实例、函数、Symbol、WeakMap、WeakSets

**Pass-through 模式（不检查 children）：**

```tsx
async function CachedWrapper({ children }: { children: ReactNode }) {
  "use cache";
  // 不要读取或修改 children，只是透传
  return (
    <div className="wrapper">
      <header>Cached Header</header>
      {children}
    </div>
  );
}

// 使用：children 可以是动态的
export default function Page() {
  return (
    <CachedWrapper>
      <DynamicComponent /> {/* 不会被缓存 */}
    </CachedWrapper>
  );
}
```

#### 5.4 cacheLife 配置（缓存生命周期）

**配置文件：**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // 内置配置文件: "default", "seconds", "minutes", "hours", "days", "weeks", "max"
    // 自定义配置
    blog: {
      stale: 3600, // 1小时 - 客户端缓存时间
      revalidate: 900, // 15分钟 - 服务端重新验证间隔
      expire: 86400, // 1天 - 最大过期时间
    },
    product: {
      stale: 60, // 1分钟
      revalidate: 300, // 5分钟
      expire: 3600, // 1小时
    },
  },
};

export default nextConfig;
```

**使用方式：**

```tsx
import { cacheLife } from "next/cache";

async function getBlogData() {
  "use cache";
  cacheLife("blog"); // 使用自定义 blog 配置
  const data = await fetch("/api/blog");
  return data;
}

async function getProductData() {
  "use cache";
  cacheLife("product"); // 使用自定义 product 配置
  const data = await fetch("/api/products");
  return data;
}
```

**内置配置说明：**

| 配置      | stale | revalidate | expire |
| --------- | ----- | ---------- | ------ |
| `default` | 5分钟 | 15分钟     | 永不   |
| `seconds` | 0     | 1秒        | 1分钟  |
| `minutes` | 5分钟 | 1分钟      | 1小时  |
| `hours`   | 5分钟 | 1小时      | 1天    |
| `days`    | 5分钟 | 1天        | 1周    |
| `weeks`   | 5分钟 | 1周        | 3月    |
| `max`     | 5分钟 | 30天       | 永不   |

#### 5.5 缓存标签和重新验证

**使用 cacheTag：**

```tsx
import { cacheTag } from "next/cache";

async function getProducts() {
  "use cache";
  cacheTag("products"); // 为缓存添加标签
  return fetch("/api/products");
}

async function getProduct(id: string) {
  "use cache";
  cacheTag("products", `product-${id}`); // 多个标签
  return fetch(`/api/products/${id}`);
}
```

**重新验证方式：**

```tsx
// app/actions.ts
"use server";

import { revalidateTag, updateTag } from "next/cache";

export async function updateProduct() {
  // 方式1: revalidateTag - 清除缓存，下次请求重新获取
  revalidateTag("products");

  // 方式2: updateTag - 立即后台重新验证（推荐）
  updateTag("products");
}
```

**路径重新验证：**

```tsx
import { revalidatePath } from "next/cache";

export async function createPost() {
  // 创建文章...

  // 重新验证特定路径
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page"); // 重新验证所有 blog 页面
}
```

#### 5.6 缓存策略决策树

```
数据更新频率？
├── 几乎不变（如产品分类）
│   ├── 使用: "use cache" + cacheLife("days") 或 cacheLife("weeks")
│   └── 重新验证: 按需使用 revalidateTag
├── 偶尔更新（如文章内容）
│   ├── 使用: "use cache" + cacheLife("hours")
│   └── 重新验证: 发布后使用 updateTag
├── 频繁更新（如股票价格）
│   ├── 使用: fetch({ cache: "no-store" }) 或 dynamic 渲染
│   └── 考虑: 客户端获取
└── 用户特定数据
    ├── 使用: "use cache" + 用户ID作为参数
    └── 注意: 不要将敏感数据暴露在缓存中
```

### 6. 流式渲染

**使用 loading.tsx：**

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return <PostsSkeleton />;
}
```

**使用 Suspense：**

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <h1>Blog</h1>
      <Suspense fallback={<PostsSkeleton />}>
        <PostList />
      </Suspense>
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />
      </Suspense>
    </div>
  );
}
```

### 7. 布局和路由

**创建 Root Layout（必需）：**

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**动态路由：**

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

**页面间导航：**

```tsx
import Link from "next/link";

export default function PostList({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### 8. 性能优化

**图片优化：**

```tsx
import Image from "next/image";

export default function Avatar({ user }) {
  return (
    <Image
      src={user.avatar}
      alt={user.name}
      width={64}
      height={64}
      priority // 预加载关键图片
    />
  );
}
```

**字体优化：**

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### 9. 缓存实战示例

**场景：电商产品页面缓存策略**

```tsx
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    // 产品分类：很少变化
    categories: {
      stale: 86400, // 24小时
      revalidate: 3600, // 1小时
      expire: 604800, // 7天
    },
    // 产品详情：偶尔变化
    product: {
      stale: 3600, // 1小时
      revalidate: 300, // 5分钟
      expire: 86400, // 24小时
    },
    // 库存信息：频繁变化
    inventory: {
      stale: 30, // 30秒
      revalidate: 10, // 10秒
      expire: 300, // 5分钟
    },
  },
};

export default nextConfig;
```

```tsx
// lib/data.ts
import { cacheLife, cacheTag } from "next/cache";

// 缓存产品分类
export async function getCategories() {
  "use cache";
  cacheLife("categories");
  cacheTag("categories");

  const res = await fetch("https://api.example.com/categories");
  return res.json();
}

// 缓存产品详情
export async function getProduct(id: string) {
  "use cache";
  cacheLife("product");
  cacheTag("products", `product-${id}`);

  const res = await fetch(`https://api.example.com/products/${id}`);
  return res.json();
}

// 缓存库存（短期）
export async function getInventory(productId: string) {
  "use cache";
  cacheLife("inventory");

  const res = await fetch(`https://api.example.com/inventory/${productId}`);
  return res.json();
}
```

```tsx
// app/products/[id]/page.tsx
import { Suspense } from "react";
import { getProduct, getCategories, getInventory } from "@/lib/data";

// 产品信息（缓存）
async function ProductInfo({ id }: { id: string }) {
  const product = await getProduct(id);
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>${product.price}</p>
    </div>
  );
}

// 库存信息（短缓存）
async function InventoryInfo({ id }: { id: string }) {
  const inventory = await getInventory(id);
  return <div>库存: {inventory.quantity} 件</div>;
}

// 分类导航（长期缓存）
async function CategoryNav() {
  const categories = await getCategories();
  return (
    <nav>
      {categories.map((cat) => (
        <a key={cat.id} href={`/categories/${cat.id}`}>
          {cat.name}
        </a>
      ))}
    </nav>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      {/* 分类导航 - 长期缓存 */}
      <Suspense fallback={<NavSkeleton />}>
        <CategoryNav />
      </Suspense>

      {/* 产品信息 - 中期缓存 */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductInfo id={id} />
      </Suspense>

      {/* 库存信息 - 短期缓存 */}
      <Suspense fallback={<InventorySkeleton />}>
        <InventoryInfo id={id} />
      </Suspense>
    </div>
  );
}
```

```tsx
// app/actions.ts
"use server";

import { updateTag, revalidateTag, revalidatePath } from "next/cache";

// 更新产品后重新验证
export async function updateProduct(formData: FormData) {
  const id = formData.get("id") as string;

  // 更新数据库...
  await db.product.update({ where: { id }, data: { ... } });

  // 方式1: 后台重新验证（推荐）- 用户无感知
  updateTag(`product-${id}`);

  // 方式2: 立即失效缓存
  revalidateTag(`product-${id}`);

  // 重新验证路径
  revalidatePath(`/products/${id}`);
}

// 批量更新后重新验证
export async function updateBulkProducts() {
  await db.product.updateMany({ ... });

  // 重新验证所有产品相关缓存
  updateTag("products");
}
```

### 10. 常见模式

**Context Provider 模式：**

```tsx
// app/theme-provider.tsx
"use client";

import { createContext } from "react";

export const ThemeContext = createContext({});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}

// app/layout.tsx
import ThemeProvider from "./theme-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**Server Actions：**

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTodo(formData: FormData) {
  const title = formData.get("title") as string;

  await db.todo.create({
    data: { title, completed: false },
  });

  revalidatePath("/todos");
  redirect("/todos");
}
```

**错误处理：**

```tsx
// app/blog/[slug]/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

## ✅ 最佳实践清单

- [ ] 默认使用 Server Components
- [ ] 使用文件系统路由组织应用结构
- [ ] 合理使用缓存，根据数据更新频率选择合适的缓存策略
- [ ] 使用 "use cache" + cacheLife() 替代复杂 fetch 配置（Next.js 15+）
- [ ] 使用 cacheTag + updateTag 实现按需重新验证
- [ ] 并行获取数据，避免不必要的串行请求
- [ ] 使用 Suspense 实现流式渲染
- [ ] 优化静态资源，使用 Next.js 的图片和字体优化
- [ ] 使用 TypeScript 和内置类型辅助
- [ ] 为每个路由段添加错误处理
- [ ] 使用 server-only 保护敏感代码
- [ ] 性能监控，使用 Next.js 内置的分析工具

## 🚫 常见错误避免

### 1. Server Components 中使用客户端特性

- ❌ 使用 `useState`、`useEffect`
- ❌ 访问 `window`、`localStorage`
- ✅ 将需要这些特性的部分提取为 Client Component

### 2. 过度使用 Client Components

- ❌ 整个页面都是 Client Component
- ✅ 只将需要交互的部分设为 Client Component

### 3. 串行获取独立的数据

- ❌ `await` 每个独立的请求
- ✅ 使用 `Promise.all` 并行获取

### 4. 忘记错误边界

- ❌ 没有错误处理
- ✅ 为每个路由段添加 `error.tsx`

### 5. "use cache" 常见错误

**错误1: 在 use cache 内直接访问运行时 API**

```tsx
// ❌ 错误
async function CachedComponent() {
  "use cache";
  const cookieStore = cookies(); // 会报错！
  const user = await getUser(cookieStore.get("userId"));
  return <div>{user.name}</div>;
}

// ✅ 正确
async function Page() {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;
  return <CachedComponent userId={userId} />;
}

async function CachedComponent({ userId }: { userId: string }) {
  "use cache";
  const user = await getUser(userId);
  return <div>{user.name}</div>;
}
```

**错误2: 将动态 Promise 作为 props 传递给缓存组件**

```tsx
// ❌ 错误 - 会导致构建挂起
async function Page() {
  const dataPromise = fetch("/api/data"); // 返回 Promise
  return <CachedComponent promise={dataPromise} />;
}

async function CachedComponent({ promise }: { promise: Promise<any> }) {
  "use cache";
  const data = await promise; // 构建时无法解析
  return <div>{data}</div>;
}

// ✅ 正确
async function Page() {
  return <CachedComponent />;
}

async function CachedComponent() {
  "use cache";
  const data = await fetch("/api/data"); // 在缓存函数内获取
  return <div>{data}</div>;
}
```

**错误3: 忘记启用 cacheComponents**

```tsx
// ❌ 错误 - 直接写 "use cache" 但不配置 next.config
// 会导致编译错误

// ✅ 正确 - next.config.ts
const nextConfig = {
  cacheComponents: true, // 必须启用！
};
```

**错误4: 使用类实例作为参数**

```tsx
// ❌ 错误
class User {
  constructor(public name: string) {}
}

async function CachedComponent({ user }: { user: User }) {
  "use cache";
  return <div>{user.name}</div>; // 无法序列化类实例
}

// ✅ 正确
async function CachedComponent({ user }: { user: { name: string } }) {
  "use cache";
  return <div>{user.name}</div>; // 纯对象可以序列化
}
```

### 6. 缓存失效错误

**错误: 混淆 revalidateTag 和 updateTag**

```tsx
// ❌ 错误用法
revalidateTag("products", "max"); // revalidateTag 只接受一个参数

// ✅ 正确：使用 updateTag 进行后台重新验证
updateTag("products");

// ✅ 正确：使用 revalidateTag 立即失效缓存
revalidateTag("products");
```

## 📖 参考资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [App Router 入门](https://nextjs.org/docs/app/getting-started)
- [Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [数据获取](https://nextjs.org/docs/app/getting-started/fetching-data)
- [缓存和重新验证](https://nextjs.org/docs/app/getting-started/caching-and-revalidating)
- [use cache 指令](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [cacheLife 配置](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheLife)
- [cacheTag 函数](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [updateTag 函数](https://nextjs.org/docs/app/api-reference/functions/updateTag)

## 💡 使用提示

1. **开始新项目时**：参考"项目初始化和配置"部分，记得启用 `cacheComponents: true`
2. **架构决策时**：参考"Server 和 Client Components 策略"
3. **数据获取时**：参考"数据获取最佳实践"和"缓存策略"
4. **配置缓存时**：
   - 简单场景：使用 `fetch({ next: { revalidate: 3600 } })`
   - 复杂场景：使用 `"use cache"` + `cacheLife()` + `cacheTag()`
   - 参考"缓存实战示例"获取完整方案
5. **性能优化时**：参考"性能优化"部分
6. **遇到问题时**：参考"常见错误避免"清单，特别是 "use cache" 常见错误

## 版本信息

- Next.js 版本: 16.1.6+
- React 版本: 19+
- 文档更新日期: 2026-03-11

### 本次更新内容

**新增 Next.js 15+ 缓存特性：**

1. **"use cache" 指令** - 文件/组件/函数级缓存，需启用 `cacheComponents: true`
2. **cacheLife 配置** - 在 `next.config.ts` 中定义自定义缓存生命周期配置
3. **cacheLife() 函数** - 在缓存函数内应用预设的缓存配置
4. **updateTag() 函数** - 后台重新验证缓存（优于 revalidateTag）
5. **缓存序列化规则** - 明确参数和返回值的可序列化类型
6. **Pass-through 模式** - children/Server Actions 透传模式

**修复的过时内容：**

1. 简化 fetch 默认行为描述（移除过时的复杂说明）
2. 修正 revalidateTag 用法（移除错误的第二个参数）
3. 更新 Router Cache 说明（Next.js 15+ pages 默认不缓存）
4. 新增常见 "use cache" 错误案例
