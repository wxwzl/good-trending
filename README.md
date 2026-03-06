# Good-Trending

> 商品趋势追踪平台 - 发现 X 平台和亚马逊的热门商品趋势

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-blue)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/typescript-5.3%2B-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 项目简介

Good-Trending 是一个商品趋势追踪平台，通过爬取 X 平台（Twitter）和亚马逊的商品数据，分析并展示热门商品趋势。帮助用户发现最新的热门商品和市场动态。

### 核心功能

- **趋势追踪**: 实时追踪 X 平台和亚马逊的热门商品
- **分类浏览**: 按主题分类浏览商品，快速找到感兴趣的内容
- **智能搜索**: 支持关键词搜索，快速定位目标商品
- **多语言支持**: 支持中文和英文界面
- **明暗主题**: 支持明暗主题切换，保护用户视力
- **响应式设计**: 完美适配桌面端和移动端

---

## 技术栈

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
| 构建工具 | TurboRepo            | 2+    | 量构建缓存               |

---

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose（用于本地数据库）
- PostgreSQL 16+（或使用 Docker）
- Redis 7+（或使用 Docker）

### 为什么 API 不会自动创建数据库？

**架构设计原则：分离关注点**

本项目遵循企业级应用的最佳实践，将数据库 Schema 管理与应用运行时分离：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   数据库迁移     │ ──▶ │    种子数据      │ ──▶ │   启动 API      │
│  (schema 变更)   │     │  (初始数据)      │     │  (业务逻辑)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ↓                        ↍                      ↓
   显式命令执行              显式命令执行            应用启动
   pnpm db:migrate          pnpm db:seed            pnpm dev
```

**原因说明：**

1. **Schema 变更是敏感操作** - 数据库结构变更（添加表、修改字段）需要谨慎处理，不应在应用启动时自动执行
2. **权限分离** - 迁移需要 DDL（数据定义语言）权限，而应用运行时只需要 DML（数据操作语言）权限
3. **版本控制** - 所有数据库变更都通过版本化的迁移文件管理，便于审计和回滚
4. **团队协作** - 显式执行迁移确保所有开发者对数据库变更有统一认知
5. **生产安全** - 防止意外变更生产数据库结构

### 完整安装步骤（从零开始）

#### 步骤 1：克隆仓库并安装依赖

```bash
# 克隆仓库
git clone https://github.com/your-username/good-trending.git
cd good-trending

# 安装依赖
pnpm install
```

#### 步骤 2：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件（最小配置如下）
# --- 数据库配置 ---
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/good_trending"

# --- Redis 配置 ---
REDIS_URL="redis://localhost:6379"

# --- API 配置 ---
API_PORT=3015
API_URL="http://localhost:3015/api/v1"

# --- Web 配置 ---
WEB_PORT=3010
NEXT_PUBLIC_API_URL="http://localhost:3015/api/v1"
```

#### 步骤 3：启动基础设施（PostgreSQL + Redis）

```bash
# 使用 Docker Compose 启动数据库和缓存
pnpm docker:dev

# 验证服务状态
docker-compose -f docker-compose.dev.yml ps
```

**注意：** 首次启动会下载 Docker 镜像，可能需要几分钟。

#### 步骤 4：数据库初始化（关键步骤）

```bash
# 方式 A：使用 Drizzle Push（开发环境推荐）
# 直接根据 schema 定义创建表，无需迁移文件
pnpm db:push

# 方式 B：使用迁移（生产环境推荐）
# 先创建迁移文件，再执行迁移
pnpm db:generate   # 生成迁移文件
pnpm db:migrate    # 执行迁移

# 验证表结构
pnpm db:studio     # 打开 Drizzle Studio 可视化工具
```

**两种方式的差异：**

| 方式         | 适用场景 | 优点             | 缺点                 |
| ------------ | -------- | ---------------- | -------------------- |
| `db:push`    | 开发环境 | 快速、自动同步   | 无法回滚、不记录历史 |
| `db:migrate` | 生产环境 | 版本控制、可回滚 | 需要手动管理迁移文件 |

#### 步骤 5：填充初始数据

```bash
# 运行种子脚本，创建示例商品和趋势数据
pnpm db:seed
```

**种子数据包括：**

- 8 个示例商品（AirPods、Sony 耳机等）
- 5 个分类（电子产品、家居生活等）
- 7 天的趋势数据（用于展示 Weekly/Monthly 趋势）
- 商品与分类的关联关系

#### 步骤 6：启动开发服务器

```bash
# 方式 A：一键启动所有服务（推荐）
pnpm dev

# 方式 B：单独启动各服务（便于调试）
# 终端 1：启动 API
pnpm --filter @good-trending/api dev

# 终端 2：启动 Web
pnpm --filter @good-trending/web dev

# 终端 3：启动调度器（可选，用于定时任务）
pnpm --filter @good-trending/scheduler start
```

#### 步骤 7：验证运行状态

```bash
# 检查 API 健康状态
curl http://localhost:3015/health

# 检查数据库连接
curl http://localhost:3015/api/v1/trending

# 打开浏览器访问
open http://localhost:3010
```

### 访问地址

| 服务           | 地址                           |
| -------------- | ------------------------------ |
| Web 应用       | http://localhost:3010          |
| API 服务       | http://localhost:3015          |
| API 文档       | http://localhost:3015/api-docs |
| 健康检查       | http://localhost:3015/health   |
| Drizzle Studio | http://localhost:4983          |

---

## 故障排除

### 数据库相关问题

#### 问题 1：API 启动报错 "Database does not exist"

**原因**：PostgreSQL 容器已启动，但数据库未创建

**解决**：

```bash
# 进入 PostgreSQL 容器创建数据库
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -c "CREATE DATABASE good_trending;"

# 或自动创建（如果配置了自动创建）
pnpm db:push
```

#### 问题 2：API 启动报错 "relation 'xxx' does not exist"

**原因**：数据库存在，但表结构未创建

**解决**：

```bash
# 运行数据库迁移创建表
pnpm db:push

# 验证表是否创建
pnpm db:studio  # 打开可视化工具查看
```

#### 问题 3：页面显示 "暂无热门商品"

**原因**：表结构已创建，但没有数据

**解决**：

```bash
# 运行种子脚本填充数据
pnpm db:seed

# 验证数据
curl http://localhost:3015/api/v1/trending
```

#### 问题 4：连接数据库超时

**原因**：PostgreSQL 容器还在启动中，或端口冲突

**解决**：

```bash
# 检查容器状态
docker-compose -f docker-compose.dev.yml ps

# 查看日志
docker-compose -f docker-compose.dev.yml logs postgres

# 重启容器
docker-compose -f docker-compose.dev.yml restart postgres
```

#### 问题 5：如何完全重置数据库？

```bash
# 方式 1：使用命令
pnpm db:reset

# 方式 2：手动删除并重建容器
docker-compose -f docker-compose.dev.yml down -v  # 删除容器和数据卷
docker-compose -f docker-compose.dev.yml up -d    # 重新创建
pnpm db:push                                      # 重建表结构
pnpm db:seed                                      # 填充数据
```

### 快速诊断命令

```bash
# 1. 检查数据库连接
pg_isready -h localhost -p 5432

# 2. 检查 Redis 连接
redis-cli -h localhost -p 6379 ping

# 3. 查看 API 日志
pnpm --filter @good-trending/api dev

# 4. 测试 API 端点
curl -s http://localhost:3015/health | jq
```

---

## 项目结构

```
good-trending/
├── apps/                           # 应用程序
│   ├── web/                        # Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/[locale]/       # 国际化路由
│   │   │   ├── components/         # React 组件
│   │   │   ├── lib/                # 工具函数
│   │   │   └── i18n/               # 国际化配置
│   │   └── messages/               # 翻译文件
│   │
│   ├── api/                        # NestJS API 服务
│   │   ├── src/
│   │   │   ├── modules/            # 功能模块
│   │   │   ├── common/             # 公共模块
│   │   │   └── main.ts             # 入口文件
│   │   └── test/                   # 测试文件
│   │
│   ├── crawler/                    # Playwright 爬虫应用
│   │   └── src/
│   │       ├── crawlers/           # 爬虫实现
│   │       └── manager.ts          # 爬虫管理器
│   │
│   ├── scheduler/                  # BullMQ 调度器
│   │   └── src/
│   │       ├── queue/              # 队列配置
│   │       └── processors/         # 任务处理器
│   │
│   └── tests/                      # 独立测试应用
│       ├── src/
│       │   ├── api/                # API 集成测试
│       │   └── e2e/                # E2E 测试
│       └── playwright.config.ts
│
├── packages/                       # 共享包
│   ├── shared/                     # 共享类型和工具
│   │   └── src/
│   │       ├── types/              # 类型定义
│   │       ├── constants/          # 常量定义
│   │       └── utils/              # 工具函数
│   │
│   ├── database/                   # Drizzle 数据库包
│   │   ├── src/
│   │   │   ├── schema/             # Schema 定义
│   │   │   └── client.ts           # Drizzle Client
│   │   └── migrations/             # 迁移文件
│   │
│   └── eslint-config/              # ESLint 配置
│
├── docs/                           # 文档目录
│   ├── architecture.md             # 架构设计文档
│   └── tasks/                      # 任务规划文档
│
├── .github/workflows/              # GitHub Actions
├── docker-compose.yml              # 生产环境 Docker 配置
├── docker-compose.dev.yml          # 开发环境 Docker 配置
├── turbo.json                      # TurboRepo 配置
├── pnpm-workspace.yaml             # pnpm workspace 配置
├── package.json                    # 根 package.json
└── CLAUDE.md                       # 项目开发规范
```

---

## 开发指南

### 常用命令

```bash
# 开发
pnpm dev                    # 启动所有应用
pnpm --filter @good-trending/web dev        # 只启动 web
pnpm --filter @good-trending/api dev        # 只启动 api

# 构建
pnpm build                  # 构建所有应用
pnpm lint                   # 代码检查
pnpm typecheck              # 类型检查

# 数据库
pnpm db:generate            # 生成 Drizzle 迁移文件
pnpm db:push                # 推送 Schema 到数据库
pnpm db:migrate             # 运行迁移
pnpm db:studio              # 打开 Drizzle Studio
pnpm db:seed                # 填充种子数据
pnpm db:reset               # 重置数据库

# 测试
pnpm test                   # 运行所有测试
pnpm test:api               # 运行 API 测试
pnpm test:e2e               # 运行 E2E 测试

# Docker
pnpm docker:dev             # 启动开发环境
pnpm docker:dev:down        # 停止开发环境
pnpm docker:up              # 启动生产环境
pnpm docker:down            # 停止生产环境

# 爬虫
pnpm crawl                  # 运行所有爬虫
pnpm crawl:twitter          # 运行 Twitter 爬虫
pnpm crawl:amazon           # 运行亚马逊爬虫

# Git
pnpm commit                 # 交互式提交（使用 Commitizen）
```

### 开发规范

项目采用严格的开发规范，请参阅 [CLAUDE.md](./CLAUDE.md)：

- **TDD 开发模式**: 测试驱动开发
- **SOLID 设计原则**: 单一职责、开闭原则等
- **防御性编程**: 输入验证、边界检查
- **代码质量**: DRY、YAGNI 原则

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整（不影响功能）
refactor: 重构代码
test: 测试相关
chore: 构建/工具相关
```

---

## 部署指南

### 使用 Docker Compose

```bash
# 构建镜像
pnpm docker:build

# 启动服务
pnpm docker:up

# 查看日志
pnpm docker:logs
```

### 环境变量配置

项目支持多环境配置，根据 `NODE_ENV` 自动加载对应的环境文件。

#### 配置文件规则

```
.env.{NODE_ENV}  >  .env
```

| NODE_ENV      | 加载的文件              | 说明             |
| ------------- | ----------------------- | ---------------- |
| `development` | `.env.dev` → `.env`     | 开发环境（默认） |
| `test`        | `.env.test` → `.env`    | 测试环境         |
| `staging`     | `.env.staging` → `.env` | 预发布环境       |
| `production`  | `.env`                  | 生产环境         |

**加载优先级：**

1. 首先加载 `.env.{NODE_ENV}`（如果存在）
2. 然后加载 `.env`（作为回退和补充）

**示例：**

```bash
# 开发环境（默认）
pnpm dev

# 指定测试环境
NODE_ENV=test pnpm test

# 指定预发布环境
NODE_ENV=staging pnpm start
```

#### 配置文件创建

在项目的根目录创建以下文件：

```bash
# 开发环境配置
touch .env.dev

# 测试环境配置
touch .env.test

# 预发布环境配置
touch .env.staging

# 生产环境配置
touch .env
```

**示例 `.env.dev`：**

```bash
# 数据库配置（开发环境使用本地 Docker）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/good_trending_dev"

# Redis 配置
REDIS_URL="redis://localhost:6379/0"

# API 配置
API_PORT=3015
API_URL="http://localhost:3015/api/v1"

# Web 配置
WEB_PORT=3010
NEXT_PUBLIC_API_URL="http://localhost:3015/api/v1"

# 日志级别
LOG_LEVEL=debug
```

**示例 `.env.test`：**

```bash
# 数据库配置（测试环境使用独立数据库）
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/good_trending_test"

# Redis 配置
REDIS_URL="redis://localhost:6379/1"

# API 配置
API_PORT=3016

# Web 配置
WEB_PORT=3011
```

#### 必备环境变量

参考 `.env.example` 文件配置以下环境变量：

| 变量名       | 说明                  | 示例                                |
| ------------ | --------------------- | ----------------------------------- |
| DATABASE_URL | PostgreSQL 连接字符串 | postgresql://user:pass@host:5432/db |
| REDIS_URL    | Redis 连接字符串      | redis://localhost:6379              |
| API_PORT     | API 服务端口          | 3001                                |
| WEB_PORT     | Web 服务端口          | 3000                                |
| NODE_ENV     | 运行环境              | production                          |

### CI/CD 流程

项目使用 GitHub Actions 进行自动化 CI/CD：

- **Pull Request**: 自动运行 lint、test、build
- **Push to main**: 自动部署到生产环境
- **通知**: 部署成功/失败通知

---

## API 文档

启动 API 服务后访问 [http://localhost:3001/api-docs](http://localhost:3001/api-docs) 查看完整的 API 文档。

### API 端点

| 端点                 | 方法 | 说明         |
| -------------------- | ---- | ------------ |
| /api/v1/products     | GET  | 获取商品列表 |
| /api/v1/products/:id | GET  | 获取单个商品 |
| /api/v1/trending     | GET  | 获取热门趋势 |
| /api/v1/topics       | GET  | 获取分类列表 |
| /api/v1/topics/:slug | GET  | 获取分类详情 |
| /api/v1/search       | GET  | 搜索商品     |
| /health              | GET  | 健康检查     |

---

## 项目状态

### 开发进度

```
总任务数: 85+
已完成: 45+
进行中: 5

完成度: ████████████░░░░░░░░ 53%
```

### 里程碑

| 里程碑           | 状态      |
| ---------------- | --------- |
| M1: 基础设施就绪 | ✅ 已完成 |
| M2: API 服务可用 | ✅ 已完成 |
| M3: 前端页面完成 | ✅ 已完成 |
| M4: 测试覆盖达标 | ⚪ 待开始 |
| M5: 生产环境上线 | ⚪ 待开始 |

---

## 相关文档

- [项目开发规范 (CLAUDE.md)](./CLAUDE.md)
- [架构设计文档](./docs/architecture.md)
- [任务规划文档](./docs/tasks/README.md)
- [前端开发规范](./apps/web/CLAUDE.md)
- [API 开发规范](./apps/api/CLAUDE.md)
- [测试规范](./apps/tests/CLAUDE.md)
- [环境变量指南](./ENV_GUIDE.md)

---

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`pnpm commit`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

---

## 联系方式

- 项目地址: [https://github.com/your-username/good-trending](https://github.com/your-username/good-trending)
- 问题反馈: [Issues](https://github.com/your-username/good-trending/issues)

---

_最后更新: 2026-03-06_
