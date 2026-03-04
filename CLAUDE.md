# Good-Trending 项目代码宪法

> 本文档定义了项目的开发规范、架构设计和最佳实践。所有开发人员必须遵守这些规范。

---

## 目录

1. [代码宪法](#1-代码宪法)
2. [项目架构](#2-项目架构)
3. [API 规范](#3-api-规范)
4. [前端开发规范](#4-前端开发规范)
5. [测试规范](#5-测试规范)
6. [数据库规范](#6-数据库规范)
7. [开发流程](#7-开发流程)
8. [相关资源](#8-相关资源)

---

## 1. 代码宪法

### 1.1 开发模式

采用 **TDD（测试驱动开发）** 模式：

```
Red → Green → Refactor
  │      │        │
  │      │        └── 重构代码，优化实现
  │      └── 编写最少代码使测试通过
  └── 先编写失败的测试用例
```

**示例：**

```typescript
// 1. 先写测试 (Red)
describe('ProductService', () => {
  it('should_return_paginated_products', async () => {
    const service = new ProductService(mockRepo);
    const result = await service.getProducts({ page: 1, limit: 10 });
    expect(result.data.length).toBeLessThanOrEqual(10);
  });
});

// 2. 实现功能 (Green)
async getProducts(params: PaginationParams): Promise<PaginatedResult<Product>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(Math.max(1, params.limit || 10), 100);
  // ...
}

// 3. 重构优化 (Refactor)
// 提取公共逻辑、优化性能等
```

### 1.2 SOLID 设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **S** - 单一职责 | 每个类/模块只负责一件事 | `ProductService` 只处理商品业务逻辑 |
| **O** - 开闭原则 | 对扩展开放，对修改关闭 | 使用策略模式处理不同爬虫源 |
| **L** - 里氏替换 | 子类可以替换父类 | `BaseCrawler` 的子类可互相替换 |
| **I** - 接口隔离 | 接口要小而专一 | 分离 `IProductService` 和 `ISearchService` |
| **D** - 依赖倒置 | 依赖抽象而非具体实现 | 依赖 `IRepository` 接口而非具体实现 |

### 1.3 防御性编程

#### 输入验证

```typescript
// ✅ 正确：严格验证所有输入
async getProduct(id: string) {
  if (!id || typeof id !== 'string') {
    throw new BadRequestException('Invalid product ID');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new BadRequestException('Product ID must be a valid UUID');
  }

  return this.productRepository.findById(id);
}

// ❌ 错误：没有验证
async getProduct(id: string) {
  return this.productRepository.findById(id);
}
```

#### 边界情况处理

```typescript
// 考虑所有极端情况
function calculatePagination(total: number, page: number, limit: number) {
  // 边界检查
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(Math.max(1, limit || 10), 100); // 限制最大值
  const safeTotal = Math.max(0, total || 0);

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages: Math.ceil(safeTotal / safeLimit),
    hasNext: safePage < Math.ceil(safeTotal / safeLimit),
    hasPrev: safePage > 1,
  };
}
```

### 1.4 代码质量

#### 简洁性原则

- **DRY 原则**：Don't Repeat Yourself，禁止重复代码
- **YAGNI 原则**：You Aren't Gonna Need It，不写用不到的代码
- **及时清理**：无用的代码、注释、导入必须删除

```typescript
// ❌ 避免：重复代码
function formatPriceUSD(price: number) {
  return `$${price.toFixed(2)}`;
}
function formatPriceEUR(price: number) {
  return `€${price.toFixed(2)}`;
}

// ✅ 正确：抽象通用逻辑
function formatPrice(price: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', CNY: '¥' };
  const symbol = symbols[currency] ?? '';
  return `${symbol}${price.toFixed(2)}`;
}
```

#### 代码度量标准

| 指标 | 限制 | 说明 |
|------|------|------|
| 函数长度 | ≤ 50 行 | 过长函数需拆分 |
| 文件长度 | ≤ 300 行 | 过长文件需拆分模块 |
| 嵌套深度 | ≤ 3 层 | 使用早返回减少嵌套 |
| 参数数量 | ≤ 4 个 | 过多参数使用对象封装 |
| 圈复杂度 | ≤ 10 | 过于复杂的逻辑需重构 |

### 1.5 安全规范

#### 敏感信息处理

```typescript
// ❌ 禁止：明文传输敏感信息
const response = await fetch('/api/user', {
  body: JSON.stringify({ password: userInput }),
});

// ✅ 正确：敏感信息加密传输
import { hash } from 'bcrypt';

const hashedPassword = await hash(password, 10);
const response = await fetch('/api/user', {
  body: JSON.stringify({ passwordHash: hashedPassword }),
});
```

#### 资源安全管理

```typescript
// 确保资源正确关闭
async function withDatabase<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// 使用示例
const result = await withDatabase(async (prisma) => {
  return prisma.product.findMany();
});
```

#### 错误处理规范

```typescript
// 明确的错误处理
try {
  await crawler.execute();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error('Network error during crawl', { url: error.url });
    throw new ServiceUnavailableException('Crawler service unavailable');
  } else if (error instanceof ValidationError) {
    logger.warn('Validation error', { details: error.details });
    throw new BadRequestException('Invalid crawl parameters');
  } else {
    logger.error('Unexpected error', { error: String(error) });
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
```

### 1.6 代码注释规范

#### 注释原则

1. **解释为什么，而不是做什么**（代码本身说明做什么）
2. **关键业务逻辑必须有注释**
3. **复杂算法必须有说明**
4. **公共 API 必须有文档注释**

#### 注释模板

```typescript
/**
 * 计算商品的热门趋势分数
 *
 * @description
 * 基于多个因素计算综合热门度分数：
 * 1. 查看次数权重：40%
 * 2. 评论数量权重：30%
 * 3. 评分权重：20%
 * 4. 时间衰减权重：10%
 *
 * @param product - 商品数据
 * @param options - 计算选项
 * @returns 0-100 的热门度分数
 *
 * @example
 * ```ts
 * const score = calculateTrendingScore(product, { decayFactor: 0.95 });
 * console.log(score); // 85.5
 * ```
 */
function calculateTrendingScore(
  product: Product,
  options: ScoreOptions = {}
): number {
  // 时间衰减：越近的数据权重越高
  const daysSinceCreated = differenceInDays(new Date(), product.createdAt);
  const timeDecay = Math.pow(options.decayFactor ?? 0.9, daysSinceCreated);

  // 各项分数计算...
  const viewScore = Math.min(product.viewCount / 1000, 50) * 0.4;
  const reviewScore = Math.min(product.reviewCount / 100, 30) * 0.3;
  const ratingScore = (product.rating ?? 0) / 5 * 20 * 0.2;
  const decayScore = timeDecay * 10 * 0.1;

  return Math.round(viewScore + reviewScore + ratingScore + decayScore);
}
```

### 1.7 文档规范

#### 必须的文档

| 文档类型 | 位置 | 说明 |
|---------|------|------|
| API 接口文档 | Swagger (`/api-docs`) | 每个接口必须有 Swagger 注解 |
| 数据库设计 | `packages/database/prisma/schema.prisma` | Prisma Schema + 注释 |
| 模块架构文档 | `apps/*/README.md` | 每个应用必须有说明 |
| 核心功能文档 | `docs/architecture.md` | 复杂模块的架构设计 |

---

## 2. 项目架构

### 2.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Next.js (App Router) | 16+ | SSR/SSG，SEO 优化 |
| UI 库 | React | 19+ | Server Components 优先 |
| 样式方案 | Tailwind CSS | 4+ | CSS 变量 + Utility-first |
| 国际化 | next-intl | 4+ | URL 路由切换 |
| 主题切换 | next-themes | 0.4+ | 明暗主题 |
| 后端框架 | NestJS | 10+ | RESTful API |
| API 文档 | @nestjs/swagger | - | 自动生成 API 文档 |
| 数据库 | PostgreSQL | 16+ | 主数据存储 |
| ORM | Prisma | 5+ | 类型安全的数据库访问 |
| 缓存 | Redis | 7+ | 缓存 + 队列存储 |
| 任务队列 | BullMQ | 5+ | 定时任务管理 |
| 爬虫 | Playwright | 1.42+ | 无头浏览器爬虫 |
| 包管理 | pnpm | 9+ | Monorepo 依赖管理 |
| 构建工具 | TurboRepo | 2+ | 增量构建缓存 |

### 2.2 Monorepo 项目结构

```
good-trending/
├── apps/                           # 应用程序
│   ├── web/                        # Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/[locale]/       # 国际化路由
│   │   │   │   ├── page.tsx        # 首页
│   │   │   │   ├── trending/       # 热门页
│   │   │   │   ├── topics/         # 分类页
│   │   │   │   ├── layout.tsx      # 根布局
│   │   │   │   ├── loading.tsx     # 加载状态
│   │   │   │   ├── error.tsx       # 错误边界
│   │   │   │   └── not-found.tsx   # 404 页面
│   │   │   ├── components/         # React 组件
│   │   │   │   ├── ui/             # 基础 UI 组件
│   │   │   │   ├── layout/         # 布局组件
│   │   │   │   └── features/       # 功能组件
│   │   │   ├── lib/                # 工具函数
│   │   │   ├── hooks/              # 自定义 Hooks
│   │   │   ├── i18n/               # 国际化配置
│   │   │   └── providers/          # Context Providers
│   │   └── messages/               # 翻译文件 (en.json, zh.json)
│   │
│   ├── api/                        # NestJS API 服务
│   │   ├── src/
│   │   │   ├── modules/            # 功能模块
│   │   │   │   ├── product/        # 商品模块
│   │   │   │   ├── trending/       # 趋势模块
│   │   │   │   ├── topic/          # 分类模块
│   │   │   │   ├── search/         # 搜索模块
│   │   │   │   └── health/         # 健康检查
│   │   │   ├── common/             # 公共模块
│   │   │   ├── app.module.ts       # 根模块
│   │   │   └── main.ts             # 入口文件
│   │   └── test/                   # 测试文件
│   │
│   ├── crawler/                    # Playwright 爬虫应用
│   │   ├── src/
│   │   │   ├── crawlers/           # 爬虫实现
│   │   │   │   ├── base.ts         # 基础爬虫类
│   │   │   │   ├── twitter.ts      # X 平台爬虫
│   │   │   │   └── amazon.ts       # 亚马逊爬虫
│   │   │   ├── manager.ts          # 爬虫管理器
│   │   │   └── index.ts            # CLI 入口
│   │
│   ├── scheduler/                  # BullMQ 调度器
│   │   ├── src/
│   │   │   ├── queue/              # 队列配置
│   │   │   ├── processors/         # 任务处理器
│   │   │   ├── scheduler/          # 定时任务
│   │   │   └── index.ts            # 入口文件
│   │
│   └── tests/                      # 独立测试应用
│       ├── src/
│       │   ├── api/                # API 集成测试 (Vitest)
│       │   ├── e2e/                # E2E 测试 (Playwright)
│       │   │   ├── api/            # API E2E 测试
│       │   │   └── web/            # Web E2E 测试
│       │   ├── fixtures/           # 测试数据生成器
│       │   ├── mocks/              # MSW Mock 服务
│       │   └── utils/              # 测试工具
│       ├── playwright.config.ts
│       └── vitest.config.ts
│
├── packages/                       # 共享包
│   ├── shared/                     # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/              # 类型定义
│   │   │   ├── constants/          # 常量定义
│   │   │   └── utils/              # 工具函数
│   │   └── index.ts
│   │
│   ├── database/                   # Prisma 数据库包
│   │   ├── prisma/
│   │   │   └── schema.prisma       # 数据库 Schema
│   │   └── src/
│   │       └── client.ts           # Prisma 客户端
│   │
│   └── eslint-config/              # ESLint 配置
│       ├── base.js
│       ├── next.js
│       └── index.js
│
├── docs/                           # 文档目录
│   └── architecture.md             # 架构设计文档
│
├── .github/workflows/              # GitHub Actions
│   └── ci.yml                      # CI/CD 配置
│
├── docker-compose.yml              # 生产环境 Docker 配置
├── docker-compose.dev.yml          # 开发环境 Docker 配置
├── Dockerfile                      # 多阶段构建文件
├── turbo.json                      # TurboRepo 配置
├── pnpm-workspace.yaml             # pnpm workspace 配置
├── package.json                    # 根 package.json
└── CLAUDE.md                       # 本文档
```

### 2.3 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                   表现层 (Presentation)                      │
│  Next.js App Router + React Components                       │
│  • SSR/SSG 页面渲染  • SEO 优化  • 响应式 UI                  │
├─────────────────────────────────────────────────────────────┤
│                   应用层 (Application)                       │
│  NestJS Controllers + Services                               │
│  • RESTful API  • 业务逻辑编排  • 缓存管理                    │
├─────────────────────────────────────────────────────────────┤
│                   领域层 (Domain)                            │
│  Shared Package (@good-trending/shared)                      │
│  • 实体定义  • 值对象  • 领域服务                              │
├─────────────────────────────────────────────────────────────┤
│                   基础设施层 (Infrastructure)                │
│  Prisma + Redis + BullMQ + Playwright                        │
│  • 数据持久化  • 缓存存储  • 任务队列  • 外部服务              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API 规范

### 3.1 RESTful API 设计

#### URL 规范

```
GET    /api/v1/products              # 获取商品列表
GET    /api/v1/products/:id          # 获取单个商品
GET    /api/v1/products/slug/:slug   # 通过 slug 获取商品
POST   /api/v1/products              # 创建商品（管理用）
PUT    /api/v1/products/:id          # 更新商品（管理用）
DELETE /api/v1/products/:id          # 删除商品（管理用）

GET    /api/v1/trending              # 获取热门趋势
GET    /api/v1/trending?period=daily # 按时间范围获取

GET    /api/v1/topics                # 获取分类列表
GET    /api/v1/topics/:slug          # 获取分类详情
GET    /api/v1/topics/:slug/products # 获取分类下的商品

GET    /api/v1/search?q=keyword      # 搜索商品

GET    /health                       # 健康检查
```

#### 统一响应格式（必须遵守）

**所有后端 API 必须遵守以下统一响应格式：**

```typescript
// ============================================
// 统一响应格式定义
// ============================================

// 成功响应 - 分页列表
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 成功响应 - 单个资源
interface SingleResponse<T> {
  data: T;
}

// 成功响应 - 无数据（删除、更新等操作）
interface SuccessResponse {
  success: true;
  message: string;
}

// 错误响应（统一格式）
interface ErrorResponse {
  statusCode: number;      // HTTP 状态码
  message: string;         // 错误消息
  error: string;           // 错误类型
  timestamp: string;       // 时间戳
  path: string;            // 请求路径
  details?: Array<{        // 可选：详细错误信息
    field: string;
    message: string;
  }>;
}
```

**NestJS 实现示例：**

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

#### 响应格式

```typescript
// 成功响应 - 分页列表
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 成功响应 - 单个资源
interface SingleResponse<T> {
  data: T;
}

// 错误响应
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 3.2 Swagger 文档规范

#### Controller 装饰器

```typescript
import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'

@ApiTags('products')
@Controller('products')
export class ProductController {
  @Get()
  @ApiOperation({
    summary: '获取商品列表',
    description: '支持分页、筛选和排序。默认按创建时间倒序排列。',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码，默认 1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量，默认 10，最大 100',
    example: 10,
  })
  @ApiQuery({
    name: 'sourceType',
    required: false,
    enum: ['TWITTER', 'AMAZON'],
    description: '数据来源筛选',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回商品列表',
    type: PaginatedProductDto,
  })
  @ApiResponse({
    status: 400,
    description: '参数错误',
  })
  async getProducts(@Query() query: GetProductsDto) {
    return this.productService.getProducts(query)
  }
}
```

#### DTO 装饰器

```typescript
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetProductsDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10

  @ApiPropertyOptional({
    description: '数据来源',
    enum: ['TWITTER', 'AMAZON'],
  })
  @IsOptional()
  @IsEnum(['TWITTER', 'AMAZON'])
  sourceType?: 'TWITTER' | 'AMAZON'
}
```

---

## 4. 前端开发规范

### 4.1 Next.js 16+ 最佳实践

#### Server Components（默认）

```tsx
// ✅ 默认使用 Server Component，可直接访问数据库
async function ProductList() {
  const products = await getProducts(); // 服务端直接获取
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

#### Client Components（按需使用）

```tsx
// 仅在需要交互时使用 'use client'
'use client'

import { useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
```

#### 并行数据获取

```tsx
// ✅ 推荐：并行获取
async function Page() {
  const [products, topics] = await Promise.all([
    getProducts(),
    getTopics(),
  ])
  return <Dashboard products={products} topics={topics} />
}

// ❌ 避免：串行获取
async function Page() {
  const products = await getProducts()
  const topics = await getTopics() // 等待 products 完成
  // ...
}
```

#### 流式渲染

```tsx
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <h1>Trending Products</h1>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductList />
      </Suspense>
    </div>
  )
}
```

### 4.2 前端开发流程

#### 阶段 1: 设计理念 & UX

使用 `/ui-ux-pro-max` skill：
- 设计配色体系
- 定义主题规范（明暗模式）
- 确定 UI 组件规范
- 设计响应式断点

#### 阶段 2: 美感 & 视觉

使用 `/frontend-design` skill：
- 基于配色体系生成响应式布局设计
- 考虑移动端适配
- 设计组件层级结构

#### 阶段 3: Next.js 实现

使用 `/nextjs-best-practices` skill：
- 将设计转化为 Next.js 16 + React 19 代码
- 遵循 App Router 最佳实践
- 实现国际化路由 (`[locale]`)
- 配置 SEO 元数据

### 4.3 组件规范

#### 目录结构

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

#### 命名规范

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件文件 | `kebab-case.tsx` | `product-card.tsx` |
| 组件名称 | `PascalCase` | `ProductCard` |
| Props 接口 | `${ComponentName}Props` | `ProductCardProps` |
| Hooks 文件 | `use-${feature}.ts` | `use-products.ts` |
| 工具函数 | `camelCase` | `formatPrice` |

### 4.4 国际化规范

#### 文件组织

```
messages/
├── en.json    # 英文翻译
└── zh.json    # 中文翻译
```

#### 翻译 Key 命名

```json
{
  "navigation.home": "Home",
  "navigation.trending": "Trending",
  "home.title": "Discover What's Trending",
  "product.price": "Price: {price}"
}
```

---

## 5. 测试规范

### 5.1 测试类型与覆盖率

| 类型 | 工具 | 覆盖率要求 | 位置 |
|------|------|------------|------|
| 单元测试 | Vitest / Jest | > 70% | 各应用 `*.test.ts` |
| 集成测试 | Vitest | > 60% | `apps/tests/src/api/` |
| E2E 测试 | Playwright | 核心流程 | `apps/tests/src/e2e/` |

### 5.2 API 接口测试规范（根据 Swagger 文档编写）

**重要：所有 API 接口测试必须根据 Swagger 文档进行编写。**

#### 测试编写流程

```
1. 访问 Swagger 文档
   - 开发环境: http://localhost:3001/api-docs
   - 查看 API 的请求参数、响应格式、状态码

2. 根据 Swagger 定义编写测试
   - 验证请求参数（必填、可选、类型、范围）
   - 验证响应格式（符合统一响应格式）
   - 验证状态码（200, 400, 404, 500 等）

3. 测试用例覆盖
   - 正常场景（Happy Path）
   - 边界情况（空值、最大值、最小值）
   - 异常场景（无效参数、权限错误）
```

#### Swagger 文档示例

```yaml
# Swagger 定义的 API
/api/v1/products:
  get:
    summary: 获取商品列表
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 10
    responses:
      '200':
        description: 成功返回商品列表
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaginatedResponse'
      '400':
        description: 参数错误
```

#### 对应的测试用例

```typescript
// apps/tests/src/api/products.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupMockServer, resetMockData } from '../mocks/server'

describe('Products API - 根据 Swagger 文档编写', () => {
  setupMockServer()

  beforeEach(() => {
    resetMockData()
  })

  describe('GET /api/v1/products', () => {
    // Swagger: summary: 获取商品列表
    // Swagger: response 200: 成功返回商品列表

    it('should_return_paginated_products_with_default_params', async () => {
      // 根据 Swagger 默认值测试
      const response = await fetch('/api/v1/products')
      const data = await response.json()

      // 验证状态码
      expect(response.status).toBe(200)

      // 验证响应格式（统一响应格式）
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.total).toBeDefined()
      expect(data.page).toBe(1)        // Swagger default: 1
      expect(data.limit).toBe(10)       // Swagger default: 10
      expect(data.totalPages).toBeDefined()
    })

    // Swagger: parameter limit - minimum: 1, maximum: 100
    it('should_respect_limit_parameter_constraints', async () => {
      // 测试最大值限制
      const response = await fetch('/api/v1/products?limit=200')
      const data = await response.json()

      expect(data.limit).toBeLessThanOrEqual(100) // Swagger maximum: 100
    })

    // Swagger: parameter page - minimum: 1
    it('should_handle_invalid_page_as_bad_request', async () => {
      const response = await fetch('/api/v1/products?page=-1')

      // Swagger: response 400: 参数错误
      expect(response.status).toBe(400)
    })

    // Swagger: response 200 schema
    it('should_match_paginated_response_schema', async () => {
      const response = await fetch('/api/v1/products?page=1&limit=5')
      const data = await response.json()

      // 验证统一响应格式
      expect(data).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      })
    })
  })

  describe('GET /api/v1/products/:id', () => {
    // Swagger: summary: 获取单个商品

    it('should_return_single_product_with_valid_id', async () => {
      const productId = 'valid-uuid-here'
      const response = await fetch(`/api/v1/products/${productId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe(productId)
    })

    // Swagger: response 404
    it('should_return_404_for_non_existent_product', async () => {
      const response = await fetch('/api/v1/products/non-existent-id')

      expect(response.status).toBe(404)
    })
  })
})
```

#### E2E 测试根据 Swagger 编写

```typescript
// apps/tests/src/e2e/api/products.spec.ts
import { test, expect } from '@playwright/test'

const API_BASE = process.env.E2E_API_URL || 'http://localhost:3001'

test.describe('Products API - E2E Tests (根据 Swagger)', () => {
  // 根据 Swagger 的 GET /api/v1/products 编写
  test('GET /api/v1/products 应返回分页数据', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`)

    // Swagger: response 200
    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // 验证统一响应格式
    expect(data.data).toBeDefined()
    expect(data.total).toBeDefined()
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
  })

  // 根据 Swagger 的分页参数测试
  test('GET /api/v1/products 分页参数应正确工作', async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/v1/products?page=2&limit=5`
    )

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.page).toBe(2)
    expect(data.limit).toBe(5)
  })
})
```

### 5.3 测试命令

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行 API 测试
pnpm test:api

# 运行 E2E 测试
pnpm test:e2e

# 生成覆盖率报告
pnpm test:coverage
```

### 5.3 测试用例编写规范

#### AAA 模式

```typescript
describe('ProductService', () => {
  let service: ProductService;
  let repository: MockType<Repository<Product>>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new ProductService(repository);
  });

  describe('getProducts', () => {
    it('should_return_paginated_products_when_valid_params', async () => {
      // Arrange (准备)
      const params = { page: 1, limit: 10 };
      repository.findMany.mockResolvedValue([mockProduct]);

      // Act (执行)
      const result = await service.getProducts(params);

      // Assert (断言)
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(repository.findMany).toHaveBeenCalledWith(params);
    });

    it('should_throw_error_when_page_is_negative', async () => {
      // Arrange
      const params = { page: -1, limit: 10 };

      // Act & Assert
      await expect(service.getProducts(params))
        .rejects.toThrow(BadRequestException);
    });

    it('should_limit_max_page_size_to_100', async () => {
      // Arrange
      const params = { page: 1, limit: 200 };

      // Act
      const result = await service.getProducts(params);

      // Assert
      expect(result.limit).toBe(100);
    });
  });
});
```

#### 测试命名规范

```typescript
// 格式: should_{expected_behavior}_when_{condition}
it('should_return_empty_array_when_no_products_exist', async () => {})
it('should_calculate_correct_total_pages', async () => {})
it('should_handle_concurrent_requests_safely', async () => {})
```

---

## 6. 数据库规范

### 6.1 Prisma Schema 规范

```prisma
// 枚举定义
enum SourceType {
  TWITTER
  AMAZON
}

// 模型定义
model Product {
  // 主键
  id             String         @id @default(uuid())

  // 基本信息
  name           String         @db.VarChar(255)
  slug           String         @unique @db.VarChar(255)
  description    String?        @db.Text
  imageUrl       String?        @db.VarChar(500)

  // 来源信息
  sourceUrl      String         @db.VarChar(500)
  sourceType     SourceType
  sourceId       String         @db.VarChar(100)

  // 价格信息
  price          Decimal?       @db.Decimal(10, 2)
  currency       String         @default("USD") @db.VarChar(10)

  // 统计数据
  rating         Decimal?       @db.Decimal(3, 2)
  reviewCount    Int            @default(0)
  viewCount      Int            @default(0)
  trendingScore  Int            @default(0)

  // 状态
  isActive       Boolean        @default(true)

  // 时间戳
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // 关联关系
  topics         ProductTopic[]
  tags           ProductTag[]
  trends         Trend[]
  history        ProductHistory[]

  // 复合唯一索引
  @@unique([sourceType, sourceId])

  // 查询优化索引
  @@index([trendingScore(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([sourceType])

  // 表名映射
  @@map("products")
}
```

### 6.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 表名 | 小写下划线 | `product_topics` |
| 字段名 | 小驼峰 | `trendingScore` |
| 枚举 | 大驼峰 | `SourceType` |
| 索引 | `@@index([field])` | `@@index([createdAt])` |
| 唯一约束 | `@@unique([field])` | `@@unique([slug])` |

---

## 7. 开发流程

### 7.1 功能开发流程

```
1. 创建功能分支
   git checkout -b feature/product-detail

2. 编写测试用例 (TDD - Red)
   - 编写失败的测试
   - 确保测试覆盖边界情况

3. 实现功能代码 (TDD - Green)
   - 编写最少代码使测试通过
   - 遵循 SOLID 原则

4. 重构优化 (TDD - Refactor)
   - 消除重复代码
   - 优化性能

5. 运行测试验证
   pnpm test

6. 提交代码
   git commit -m "feat: add product detail page"

7. 创建 Pull Request
   - 等待 Code Review
   - 修复 Review 意见
```

#### 💡 实施策略重要提示

**所有开发人员必须遵守以下开发原则：**

- ✅ **遵循 TDD**: 测试先行，确保代码质量
- ✅ **垂直切片**: 按功能模块从上到下完整实现
- ✅ **持续集成**: 每次提交都运行测试
- ✅ **定期更新文档**: 更新 progress.md 记录进展

**实施原则说明：**

1. **TDD (测试驱动开发)**
   - 先写测试，后写实现
   - Red → Green → Refactor 循环
   - 保证代码可测试性和质量

2. **垂直切片**
   - 每个功能模块完整实现（前端 → API → 数据库）
   - 避免水平分层开发导致的集成问题
   - 快速交付可用的功能

3. **持续集成**
   - 每次代码提交自动运行测试
   - 测试失败阻止合并
   - 保持主分支始终可用

4. **文档更新**
   - 每日更新 progress.md
   - 记录遇到的问题和解决方案
   - 保持 findings.md 同步更新

### 7.2 Git Commit 规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整（不影响功能）
refactor: 重构代码
test: 测试相关
chore: 构建/工具相关
```

示例：
```
feat: add product detail page with SEO optimization
fix: handle empty product list in trending page
docs: update API documentation for search endpoint
test: add integration tests for product service
```

### 7.3 常用命令

```bash
# 开发
pnpm dev                    # 启动所有应用
pnpm --filter @good-trending/web dev        # 只启动 web
pnpm --filter @good-trending/api dev        # 只启动 api

# 数据库
pnpm db:generate            # 生成 Prisma Client
pnpm db:migrate:dev         # 运行迁移
pnpm db:studio              # 打开 Prisma Studio

# 测试
pnpm test                   # 运行所有测试
pnpm test:api               # 运行 API 测试
pnpm test:e2e               # 运行 E2E 测试

# 构建
pnpm build                  # 构建所有应用
pnpm lint                   # 代码检查

# Docker
pnpm docker:dev             # 启动开发环境
pnpm docker:up              # 启动生产环境
```

---

## 8. 相关资源

### 8.1 技术文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [NestJS 官方文档](https://docs.nestjs.com)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [Playwright 官方文档](https://playwright.dev)

### 8.2 项目文档

- [架构设计文档](./docs/architecture.md)
- [API 文档](http://localhost:3001/api-docs) - 启动 API 后访问

### 8.3 Skills 使用

| Skill | 用途 | 调用方式 |
|-------|------|---------|
| `/ui-ux-pro-max` | 配色体系 + 主题规范 | 前端设计阶段 1 |
| `/frontend-design` | 响应式布局设计 | 前端设计阶段 2 |
| `/nextjs-best-practices` | Next.js 最佳实践 | 前端实现阶段 |
| `/superpowers:brainstorming` | 创意探索 | 功能设计前 |
| `/superpowers:test-driven-development` | TDD 开发 | 编写代码前 |
| `/superpowers:systematic-debugging` | 系统化调试 | 遇到 bug 时 |

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|---------|
| 2026-03-04 | 1.0.0 | 初始版本，定义代码宪法和项目架构 |

---

*最后更新: 2026-03-04*
