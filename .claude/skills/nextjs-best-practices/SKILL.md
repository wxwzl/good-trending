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
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>{count} likes</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  )
}
```

**组合模式：**
```tsx
// Server Component (Layout)
import Search from './search'  // Client Component

export default function Layout({ children }) {
  return (
    <>
      <nav>
        <Logo />
        <Search />  {/* 仅 Search 是 Client Component */}
      </nav>
      <main>{children}</main>
    </>
  )
}
```

### 4. 数据获取最佳实践

**Server Components 中获取数据：**
```tsx
// 默认不缓存
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  return <PostList posts={await data.json()} />
}

// 强制缓存
export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    cache: 'force-cache'
  })
  // ...
}

// 定时重新验证
export default async function Page() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }  // 每小时重新验证
  })
  // ...
}
```

**并行数据获取（推荐）：**
```tsx
// ✅ 推荐：并行获取
export default async function Page() {
  const artistData = getArtist()
  const albumsData = getAlbums()

  const [artist, albums] = await Promise.all([artistData, albumsData])
  return <ArtistView artist={artist} albums={albums} />
}

// ❌ 避免：串行获取
export default async function Page() {
  const artist = await getArtist()
  const albums = await getAlbums(artist.id)  // 等待 artist
  return <ArtistView artist={artist} albums={albums} />
}
```

### 5. 缓存和重新验证

**fetch 缓存选项：**
```tsx
// 不缓存（默认）
await fetch('https://...', { cache: 'no-store' })

// 强制缓存
await fetch('https://...', { cache: 'force-cache' })

// 定时重新验证
await fetch('https://...', { next: { revalidate: 3600 } })

// 基于标签的重新验证
await fetch('https://...', { next: { tags: ['users'] } })
```

**使用 cacheTag 和 revalidateTag：**
```tsx
// lib/data.ts
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products')

  const products = await db.query('SELECT * FROM products')
  return products
}

// actions.ts
'use server'

import { revalidateTag } from 'next/cache'

export async function updateProduct() {
  // 更新产品...
  revalidateTag('products', 'max')  // 使用 stale-while-revalidate
}
```

### 6. 流式渲染

**使用 loading.tsx：**
```tsx
// app/blog/loading.tsx
export default function Loading() {
  return <PostsSkeleton />
}
```

**使用 Suspense：**
```tsx
import { Suspense } from 'react'

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
  )
}
```

### 7. 布局和路由

**创建 Root Layout（必需）：**
```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
```

**动态路由：**
```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

**页面间导航：**
```tsx
import Link from 'next/link'

export default function PostList({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

### 8. 性能优化

**图片优化：**
```tsx
import Image from 'next/image'

export default function Avatar({ user }) {
  return (
    <Image
      src={user.avatar}
      alt={user.name}
      width={64}
      height={64}
      priority  // 预加载关键图片
    />
  )
}
```

**字体优化：**
```tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

### 9. 常见模式

**Context Provider 模式：**
```tsx
// app/theme-provider.tsx
'use client'

import { createContext } from 'react'

export const ThemeContext = createContext({})

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeContext.Provider value="dark">
      {children}
    </ThemeContext.Provider>
  )
}

// app/layout.tsx
import ThemeProvider from './theme-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

**Server Actions：**
```tsx
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string

  await db.todo.create({
    data: { title, completed: false },
  })

  revalidatePath('/todos')
  redirect('/todos')
}
```

**错误处理：**
```tsx
// app/blog/[slug]/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

## ✅ 最佳实践清单

- [ ] 默认使用 Server Components
- [ ] 使用文件系统路由组织应用结构
- [ ] 合理使用缓存，根据数据更新频率选择合适的缓存策略
- [ ] 并行获取数据，避免不必要的串行请求
- [ ] 使用 Suspense 实现流式渲染
- [ ] 优化静态资源，使用 Next.js 的图片和字体优化
- [ ] 使用 TypeScript 和内置类型辅助
- [ ] 为每个路由段添加错误处理
- [ ] 使用 server-only 保护敏感代码
- [ ] 性能监控，使用 Next.js 内置的分析工具

## 🚫 常见错误避免

1. **不要在 Server Components 中使用客户端特性**
   - ❌ 使用 `useState`、`useEffect`
   - ❌ 访问 `window`、`localStorage`
   - ✅ 将需要这些特性的部分提取为 Client Component

2. **不要过度使用 Client Components**
   - ❌ 整个页面都是 Client Component
   - ✅ 只将需要交互的部分设为 Client Component

3. **不要串行获取独立的数据**
   - ❌ `await` 每个独立的请求
   - ✅ 使用 `Promise.all` 并行获取

4. **不要忘记错误边界**
   - ❌ 没有错误处理
   - ✅ 为每个路由段添加 `error.tsx`

## 📖 参考资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [App Router 入门](https://nextjs.org/docs/app/getting-started)
- [Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [数据获取](https://nextjs.org/docs/app/getting-started/fetching-data)
- [缓存和重新验证](https://nextjs.org/docs/app/getting-started/caching-and-revalidating)

## 💡 使用提示

1. **开始新项目时**：参考"项目初始化和配置"部分
2. **架构决策时**：参考"Server 和 Client Components 策略"
3. **数据获取时**：参考"数据获取最佳实践"和"缓存策略"
4. **性能优化时**：参考"性能优化"部分
5. **遇到问题时**：参考"常见错误避免"清单

## 版本信息

- Next.js 版本: 16.1.6+
- React 版本: 19+
- 文档更新日期: 2026-03-03
