# Good-Trending 项目代码宪法

> 本文档定义了项目的开发规范、架构设计和最佳实践。所有开发人员必须遵守这些规范。

---

## 目录

1. [代码宪法](#1-代码宪法)
2. [项目架构](#2-项目架构)
3. [子应用规范索引](#3-子应用规范索引)
4. [开发流程](#4-开发流程)
5. [相关资源](#5-相关资源)

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

| 原则             | 说明                    | 示例                                       |
| ---------------- | ----------------------- | ------------------------------------------ |
| **S** - 单一职责 | 每个类/模块只负责一件事 | `ProductService` 只处理商品业务逻辑        |
| **O** - 开闭原则 | 对扩展开放，对修改关闭  | 使用策略模式处理不同爬虫源                 |
| **L** - 里氏替换 | 子类可以替换父类        | `BaseCrawler` 的子类可互相替换             |
| **I** - 接口隔离 | 接口要小而专一          | 分离 `IProductService` 和 `ISearchService` |
| **D** - 依赖倒置 | 依赖抽象而非具体实现    | 依赖 `IRepository` 接口而非具体实现        |

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
function formatPrice(price: number, currency: string = "USD"): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", CNY: "¥" };
  const symbol = symbols[currency] ?? "";
  return `${symbol}${price.toFixed(2)}`;
}
```

#### 代码度量标准

| 指标     | 限制     | 说明                 |
| -------- | -------- | -------------------- |
| 函数长度 | ≤ 50 行  | 过长函数需拆分       |
| 文件长度 | ≤ 300 行 | 过长文件需拆分模块   |
| 嵌套深度 | ≤ 3 层   | 使用早返回减少嵌套   |
| 参数数量 | ≤ 4 个   | 过多参数使用对象封装 |
| 圈复杂度 | ≤ 10     | 过于复杂的逻辑需重构 |

### 1.5 安全规范

#### 敏感信息处理

```typescript
// ❌ 禁止：明文传输敏感信息
const response = await fetch("/api/user", {
  body: JSON.stringify({ password: userInput }),
});

// ✅ 正确：敏感信息加密传输
import { hash } from "bcrypt";

const hashedPassword = await hash(password, 10);
const response = await fetch("/api/user", {
  body: JSON.stringify({ passwordHash: hashedPassword }),
});
```

#### 资源安全管理

````typescript
// 确保资源正确关闭
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// 应用关闭时断开连接
process.on('beforeExit', async () => {
  await pool.end();
});

#### 错误处理规范

```typescript
// 明确的错误处理
try {
  await crawler.execute();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error("Network error during crawl", { url: error.url });
    throw new ServiceUnavailableException("Crawler service unavailable");
  } else if (error instanceof ValidationError) {
    logger.warn("Validation error", { details: error.details });
    throw new BadRequestException("Invalid crawl parameters");
  } else {
    logger.error("Unexpected error", { error: String(error) });
    throw new InternalServerErrorException("An unexpected error occurred");
  }
}
````

### 1.6 代码注释规范

#### 注释原则

1. **解释为什么，而不是做什么**（代码本身说明做什么）
2. **关键业务逻辑必须有注释**
3. **复杂算法必须有说明**
4. **公共 API 必须有文档注释**

#### 注释模板

````typescript
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
function calculateTrendingScore(product: Product, options: ScoreOptions = {}): number {
  // 时间衰减：越近的数据权重越高
  const daysSinceCreated = differenceInDays(new Date(), product.createdAt);
  const timeDecay = Math.pow(options.decayFactor ?? 0.9, daysSinceCreated);

  // 各项分数计算...
  const viewScore = Math.min(product.viewCount / 1000, 50) * 0.4;
  const reviewScore = Math.min(product.reviewCount / 100, 30) * 0.3;
  const ratingScore = ((product.rating ?? 0) / 5) * 20 * 0.2;
  const decayScore = timeDecay * 10 * 0.1;

  return Math.round(viewScore + reviewScore + ratingScore + decayScore);
}
````

### 1.7 文档规范

#### 必须的文档

| 文档类型     | 位置                            | 说明                        |
| ------------ | ------------------------------- | --------------------------- |
| API 接口文档 | Swagger (`/api-docs`)           | 每个接口必须有 Swagger 注解 |
| 数据库设计   | `packages/database/src/schema/` | Drizzle Schema + 注释       |
| 模块架构文档 | `apps/*/README.md`              | 每个应用必须有说明          |
| 核心功能文档 | `docs/architecture.md`          | 复杂模块的架构设计          |

---

## 2. 项目架构

### 2.1 技术栈

| 层级     | 技术                 | 版本  | 说明                     |
| -------- | -------------------- | ----- | ------------------------ |
| 前端框架 | Next.js (App Router) | 16+   | SSR/SSG，SEO 优化        |
| UI 库    | React                | 19+   | Server Components 优先   |
| 样式方案 | Tailwind CSS         | 4+    | CSS 变量 + Utility-first |
| 国际化   | next-intl            | 4+    | URL 路由切换             |
| 主题切换 | next-themes          | 0.4+  | 明暗主题                 |
| 后端框架 | NestJS               | 10+   | RESTful API              |
| API 文档 | @nestjs/swagger      | -     | 自动生成 API 文档        |
| 数据库   | PostgreSQL           | 16+   | 主数据存储               |
| ORM      | Drizzle ORM          | 0.44+ | 类型安全的数据库访问     |
| 缓存     | Redis                | 7+    | 缓存 + 队列存储          |
| 任务队列 | BullMQ               | 5+    | 定时任务管理             |
| 爬虫     | Playwright           | 1.42+ | 无头浏览器爬虫           |
| 包管理   | pnpm                 | 9+    | Monorepo 依赖管理        |
| 构建工具 | TurboRepo            | 2+    | 增量构建缓存             |

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
│   ├── database/                   # Drizzle 数据库包
│   │   ├── src/
│   │   │   ├── schema/             # Schema 定义目录
│   │   │   ├── client.ts           # Drizzle Client
│   │   │   └── index.ts            # 统一导出
│   │   ├── migrations/             # 迁移文件目录
│   │   └── drizzle.config.ts       # Drizzle Kit 配置
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
│  Drizzle ORM + Redis + BullMQ + Playwright                   │
│  • 数据持久化  • 缓存存储  • 任务队列  • 外部服务              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 子应用规范索引

各子应用的详细规范请查阅对应文档：

### 3.1 前端开发规范

📄 **[apps/web/CLAUDE.md](./apps/web/CLAUDE.md)**

包含内容：

- Next.js 16+ 最佳实践（Server Components、Client Components、并行数据获取、流式渲染）
- 前端开发流程（设计理念 & UX → 美感 & 视觉 → Next.js 实现）
- 组件规范（目录结构、命名规范）
- 国际化规范（文件组织、翻译 Key 命名）

### 3.2 API 开发规范 & 数据库规范

📄 **[apps/api/CLAUDE.md](./apps/api/CLAUDE.md)**

包含内容：

- RESTful API 设计（URL 规范、统一响应格式）
- Swagger 文档规范（Controller 装饰器、DTO 装饰器）
- Drizzle Schema 规范
- 命名规范（表名、字段名、枚举、索引）

### 3.3 测试规范

📄 **[apps/tests/CLAUDE.md](./apps/tests/CLAUDE.md)**

包含内容：

- 测试类型与覆盖率要求
- API 接口测试规范（根据 Swagger 文档编写）
- 测试命令
- 测试用例编写规范（AAA 模式、命名规范）

---

## 4. 开发流程

### 4.1 功能开发流程

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

#### 4.1.1 实施策略重要提示

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

#### 4.1.2 大型任务拆解范式（Harness 模式）

> 参考：[Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

当遇到需要在多个会话中完成的大型任务时，采用 **Harness 模式** 进行任务管理和状态传递。

**核心问题：** 长期运行的代理面临每个新会话从空白状态开始的挑战，缺乏对之前工作的记忆。

**解决方案：** 两阶段工作模式

```
┌─────────────────────────────────────────────────────────────┐
│                    第一阶段：初始化代理                       │
│  首次运行时设置环境，创建任务跟踪文件                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    第二阶段：编码代理                         │
│  每个后续会话读取状态，增量式完成任务                          │
└─────────────────────────────────────────────────────────────┘
```

**文件结构：**

```
.claude-harness/
├── 用户认证系统-2026-3-5/           # 任务目录（任务名-开始日期）
│   ├── init.sh                      # 启动脚本（运行开发服务器、环境检查）
│   ├── progress.md                  # 进度日志（记录每个会话的工作内容）
│   ├── feature-list.json            # 功能清单（JSON格式，标记完成状态）
│   └── findings.md                  # 问题记录（遇到的坑和解决方案）
│
├── 商品推荐引擎-2026-3-5/           # 支持多个大型任务并行
│   ├── init.sh
│   ├── progress.md
│   ├── feature-list.json
│   └── findings.md
│
└── 数据分析模块-2026-3-5-1/         # 同名同日任务加数字后缀
    ├── init.sh
    ├── progress.md
    ├── feature-list.json
    └── findings.md
```

**目录命名规则：**

- 格式：`{任务名}-{年}-{月}-{日}`
- 示例：`用户认证系统-2026-3-5`
- 重名处理：追加数字后缀，如 `用户认证系统-2026-3-5-1`、`用户认证系统-2026-3-5-2`
- 支持多个大型任务同时存在，互不干扰

**功能清单格式：**

```json
{
  "taskName": "用户认证系统",
  "description": "实现完整的用户认证流程",
  "features": [
    {
      "id": "auth-01",
      "name": "用户注册 API",
      "priority": "high",
      "passes": false,
      "notes": ""
    },
    {
      "id": "auth-02",
      "name": "用户登录 API",
      "priority": "high",
      "passes": false,
      "notes": ""
    }
  ]
}
```

**工作流程：**

```
每个会话开始：
1. 运行 pwd 确认工作目录
2. 读取 git 日志和进度文件
3. 读取功能清单，选择未完成的最高优先级功能
4. 运行 ./init.sh 启动开发环境
5. 开始实现新功能

每个会话结束：
1. 运行测试验证功能
2. 提交 git commit
3. 更新 progress.md 记录工作内容
4. 更新 feature-list.json 标记完成状态
5. 确保留下"干净状态"（无重大 bug、代码整洁）

任务全部完成后：
1. 确认所有功能 passes: true
2. 运行完整测试套件
3. 删除该任务的目录 `.claude-harness/{任务名}-{日期}/`
4. 创建最终 git commit
5. 其他并行任务不受影响
```

**失败模式与预防：**

| 问题             | 预防措施                         |
| ---------------- | -------------------------------- |
| 过早宣布完成     | 功能清单 JSON 文件强制验证       |
| 环境遗留 bug     | git 提交 + 进度文件记录          |
| 功能标记过早完成 | 端到端测试验证后才标记 passes    |
| 不知如何运行应用 | init.sh 脚本标准化启动流程       |
| 会话间记忆丢失   | progress.md 记录关键决策和上下文 |

**关键原则：**

- ✅ **增量式工作**：每次会话只处理一个功能
- ✅ **状态持久化**：通过文件实现会话间记忆传递
- ✅ **干净状态**：每个会话结束确保代码可运行
- ✅ **及时清理**：任务完成后删除对应任务目录，不影响其他并行任务
- ✅ **多任务并行**：支持多个大型任务同时进行，每个任务独立目录

### 4.2 Git Commit 规范

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

### 4.3 常用命令

```bash
# 开发
pnpm dev                    # 启动所有应用
pnpm --filter @good-trending/web dev        # 只启动 web
pnpm --filter @good-trending/api dev        # 只启动 api

# 数据库
pnpm db:generate            # 生成 Drizzle 迁移文件
pnpm db:push                # 推送 Schema 到数据库
pnpm db:migrate             # 运行迁移
pnpm db:studio              # 打开 Drizzle Studio

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

## 5. 相关资源

### 5.1 技术文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [NestJS 官方文档](https://docs.nestjs.com)
- [Drizzle ORM 官方文档](https://orm.drizzle.team/docs/overview)
- [Tailwind CSS 官方文档](https://tailwindcss.com/docs)
- [Playwright 官方文档](https://playwright.dev)

### 5.2 项目文档

- [架构设计文档](./docs/architecture.md)
- [API 文档](http://localhost:3001/api-docs) - 启动 API 后访问

### 5.3 Skills 使用

| Skill                                  | 用途                | 调用方式       |
| -------------------------------------- | ------------------- | -------------- |
| `/ui-ux-pro-max`                       | 配色体系 + 主题规范 | 前端设计阶段 1 |
| `/frontend-design`                     | 响应式布局设计      | 前端设计阶段 2 |
| `/nextjs-best-practices`               | Next.js 最佳实践    | 前端实现阶段   |
| `/superpowers:brainstorming`           | 创意探索            | 功能设计前     |
| `/superpowers:test-driven-development` | TDD 开发            | 编写代码前     |
| `/superpowers:systematic-debugging`    | 系统化调试          | 遇到 bug 时    |

---

## 更新日志

| 日期       | 版本  | 更新内容                                              |
| ---------- | ----- | ----------------------------------------------------- |
| 2026-03-05 | 1.2.0 | 新增大型任务拆解范式（Harness 模式）规范              |
| 2026-03-04 | 1.1.0 | 重构文档结构：前端规范、API规范、测试规范抽离到子应用 |
| 2026-03-04 | 1.0.0 | 初始版本，定义代码宪法和项目架构                      |

---

_最后更新: 2026-03-05_
