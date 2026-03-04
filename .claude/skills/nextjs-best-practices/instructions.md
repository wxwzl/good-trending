# Next.js 16+ 最佳实践指南

本文档提供了使用 Next.js App Router 构建应用的全面最佳实践指导。

## 目录

1. [安装和配置](#安装和配置)
2. [项目结构](#项目结构)
3. [路由和布局](#路由和布局)
4. [Server 和 Client Components](#server-和-client-components)
5. [数据获取](#数据获取)
6. [缓存和重新验证](#缓存和重新验证)
7. [性能优化](#性能优化)
8. [常见模式](#常见模式)

---

## 安装和配置

### 创建新项目

推荐使用 `create-next-app` CLI 创建项目：

```bash
pnpm create next-app@latest my-app
# 或使用默认配置快速创建
pnpm create next-app@latest my-app --yes
```

默认配置包括：
- TypeScript
- Tailwind CSS
- ESLint
- App Router
- Turbopack（默认打包工具）
- 导入别名 `@/*`

### 系统要求

- Node.js 20.9+
- 支持的操作系统：macOS、Windows (包括 WSL)、Linux
- 支持的浏览器：Chrome 111+、Edge 111+、Firefox 111+、Safari 16.4+

### 推荐的项目脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix"
  }
}
```

### TypeScript 配置

Next.js 内置 TypeScript 支持。推荐配置：

```json
{
  "compilerOptions": {
    "baseUrl": "src/",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 项目结构

### 顶级文件夹

| 文件夹 | 用途 |
|--------|------|
| `app` | App Router |
| `pages` | Pages Router（可选） |
| `public` | 静态资源 |
| `src` | 可选的应用源码文件夹 |

### 路由文件约定

| 文件名 | 用途 |
|--------|------|
| `layout.tsx` | 布局（共享 UI） |
| `page.tsx` | 页面（路由入口） |
| `loading.tsx` | 加载状态（Suspense 边界） |
| `error.tsx` | 错误边界 |
| `not-found.tsx` | 404 页面 |
| `route.ts` | API 路由处理器 |

### 组织策略

#### 1. 项目文件放在 app 外部

```
my-app/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
└── utils/
```

#### 2. 项目文件放在 app 内的顶级文件夹

```
my-app/
├── app/
│   ├── components/
│   ├── lib/
│   ├── layout.tsx
│   └── page.tsx
```

#### 3. 按功能或路由分割

```
my-app/
├── app/
│   ├── components/     # 共享组件
│   ├── lib/            # 共享工具
│   ├── blog/
│   │   ├── _components/  # 博客特定组件
│   │   ├── _lib/         # 博客特定工具
│   │   └── page.tsx
│   └── shop/
│       ├── _components/  # 商店特定组件
│       └── page.tsx
```

### 私有文件夹

使用下划线前缀创建私有文件夹：

```
app/
├── blog/
│   ├── _components/  # 不会被路由访问
│   ├── _lib/         # 私有工具函数
│   └── page.tsx
```

### 路由组

使用括号组织路由而不影响 URL：

```
app/
├── (marketing)/
│   ├── about/
│   │   └── page.tsx    # /about
│   └── blog/
│       └── page.tsx    # /blog
└── (shop)/
    ├── cart/
    │   └── page.tsx    # /cart
    └── layout.tsx      # 仅适用于 shop 路由
```

---

## 路由和布局

### 创建页面

```tsx
// app/page.tsx
export default function HomePage() {
  return <h1>Home Page</h1>
}
```

### 创建布局

```tsx
// app/layout.tsx (Root Layout - 必需)
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

### 嵌套布局

```tsx
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <nav>Blog Navigation</nav>
      {children}
    </section>
  )
}
```

### 动态路由

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

### 使用类型辅助

```tsx
// Next.js 提供全局类型辅助
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>Blog post: {slug}</h1>
}
```

### 页面间导航

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

### 搜索参数处理

```tsx
// Server Component
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filters = (await searchParams).filters
  // 使用 filters 从数据库加载数据
}

// Client Component
'use client'
import { useSearchParams } from 'next/navigation'

export default function FilterComponent() {
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')
  // 仅用于客户端过滤
}
```

---

## Server 和 Client Components

### 何时使用 Server Components

使用 Server Components 当你需要：
- 直接访问数据库或 API
- 使用 API 密钥、令牌等敏感信息
- 减少发送到浏览器的 JavaScript
- 改善首次内容绘制 (FCP)

### 何时使用 Client Components

使用 Client Components 当你需要：
- 状态和事件处理器（`onClick`, `onChange`）
- 生命周期逻辑（`useEffect`）
- 浏览器专用 API（`localStorage`, `window`）
- 自定义 hooks

### 创建 Client Component

```tsx
// app/ui/counter.tsx
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

### 组合模式

#### 模式 1: 将 Client Component 叶子节点化

```tsx
// app/layout.tsx (Server Component)
import Search from './search'
import Logo from './logo'

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

#### 模式 2: 使用 children 作为插槽

```tsx
// app/ui/modal.tsx (Client Component)
'use client'

export default function Modal({ children }: { children: React.ReactNode }) {
  return <div className="modal">{children}</div>
}

// app/page.tsx (Server Component)
import Modal from './ui/modal'
import Cart from './ui/cart'

export default function Page() {
  return (
    <Modal>
      <Cart />  {/* Cart 在服务器上渲染 */}
    </Modal>
  )
}
```

### Context Provider 模式

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

### 第三方组件包装

```tsx
// app/ui/carousel.tsx
'use client'

import { Carousel } from 'acme-carousel'

export default Carousel  // 直接重新导出

// app/page.tsx
import Carousel from './ui/carousel'

export default function Page() {
  return <Carousel />  // 现在可以在 Server Component 中使用
}
```

### 防止环境污染

```tsx
// lib/data.ts
import 'server-only'  // 防止在客户端导入

export async function getData() {
  const res = await fetch('https://api.example.com/data', {
    headers: {
      authorization: process.env.API_KEY,  // 安全：不会暴露给客户端
    },
  })
  return res.json()
}
```

---

## 数据获取

### Server Components 中获取数据

#### 使用 fetch API

```tsx
// 默认不缓存
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  const posts = await data.json()
  return <PostList posts={posts} />
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

#### 使用 ORM 或数据库

```tsx
import { db } from '@/lib/db'

export default async function Page() {
  const posts = await db.post.findMany()
  return <PostList posts={posts} />
}
```

### Client Components 中获取数据

#### 使用 React use() API

```tsx
// app/page.tsx (Server Component)
import Posts from './posts'

export default async function Page() {
  const postsPromise = getPosts()  // 不 await
  return <Posts postsPromise={postsPromise} />
}

// app/posts.tsx (Client Component)
'use client'
import { use } from 'react'

export default function Posts({
  postsPromise
}: {
  postsPromise: Promise<Post[]>
}) {
  const posts = use(postsPromise)
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

#### 使用 SWR 或 React Query

```tsx
'use client'
import useSWR from 'swr'

export default function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error</div>
  return <div>Hello {data.name}</div>
}
```

### 并行数据获取

```tsx
// ❌ 串行获取 - 不推荐
export default async function Page() {
  const artist = await getArtist()
  const albums = await getAlbums(artist.id)  // 等待 artist
  return <ArtistView artist={artist} albums={albums} />
}

// ✅ 并行获取 - 推荐
export default async function Page() {
  const artistData = getArtist()
  const albumsData = getAlbums()

  const [artist, albums] = await Promise.all([artistData, albumsData])
  return <ArtistView artist={artist} albums={albums} />
}
```

### 使用 React.cache 去重

```tsx
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})

// 在多个地方调用，只会执行一次
export default async function Layout() {
  const user = await getUser('1')
  // ...
}

export default async function Page() {
  const user = await getUser('1')  // 使用缓存的结果
  // ...
}
```

### 流式渲染

#### 使用 loading.tsx

```
app/
└── blog/
    ├── loading.tsx  # 加载状态
    └── page.tsx     # 页面内容
```

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return <PostsSkeleton />
}
```

#### 使用 Suspense

```tsx
import { Suspense } from 'react'
import PostList from './post-list'
import Recommendations from './recommendations'

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

---

## 缓存和重新验证

### fetch 缓存选项

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

### 使用 cacheTag

```tsx
// app/lib/data.ts
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products')

  const products = await db.query('SELECT * FROM products')
  return products
}
```

### 按需重新验证

```tsx
// app/lib/actions.ts
'use server'

import { revalidateTag, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'

// 使用 stale-while-revalidate 语义
export async function updateUser(id: string) {
  await db.user.update({ where: { id }, data: { ... } })
  revalidateTag('user', 'max')  // 推荐
}

// 立即过期缓存（read-your-own-writes）
export async function createPost(formData: FormData) {
  const post = await db.post.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
    },
  })

  updateTag('posts')      // 立即过期
  updateTag(`post-${post.id}`)

  redirect(`/posts/${post.id}`)
}
```

### 路径重新验证

```tsx
import { revalidatePath } from 'next/cache'

export async function updateProfile() {
  // 更新数据...
  revalidatePath('/profile')  // 重新验证 /profile 路由
}
```

---

## 性能优化

### 图片优化

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

### 字体优化

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

### 元数据和 OG 图片

```tsx
// app/layout.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: 'Description',
  openGraph: {
    title: 'My App',
    description: 'Description',
    images: ['/og-image.png'],
  },
}

// 动态元数据
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.excerpt,
  }
}
```

### 代码分割

```tsx
// 动态导入组件
import dynamic from 'next/dynamic'

const DynamicChart = dynamic(() => import('./chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,  // 仅客户端渲染
})
```

---

## 常见模式

### 认证模式

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}
```

### 错误处理

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

### API 路由

```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const posts = await getPosts()
  return NextResponse.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const post = await createPost(body)
  return NextResponse.json(post, { status: 201 })
}
```

### Server Actions

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

---

## 最佳实践总结

1. **默认使用 Server Components**，仅在需要时使用 Client Components
2. **使用文件系统路由**组织应用结构
3. **合理使用缓存**，根据数据更新频率选择合适的缓存策略
4. **并行获取数据**，避免不必要的串行请求
5. **使用 Suspense**实现流式渲染，改善用户体验
6. **优化静态资源**，使用 Next.js 的图片和字体优化
7. **类型安全**，使用 TypeScript 和内置类型辅助
8. **错误边界**，为每个路由段添加错误处理
9. **安全实践**，使用 server-only 保护敏感代码
10. **性能监控**，使用 Next.js 内置的分析工具

---

## 参考资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Next.js GitHub](https://github.com/vercel/next.js)
