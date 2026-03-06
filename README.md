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

### 安装步骤

1. **克隆仓库**

```bash
git clone https://github.com/your-username/good-trending.git
cd good-trending
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
```

4. **启动本地数据库**

```bash
pnpm docker:dev
```

5. **运行数据库迁移**

```bash
pnpm db:migrate:dev
pnpm db:seed
```

6. **启动开发服务器**

```bash
# 启动所有服务
pnpm dev

# 或单独启动
pnpm --filter @good-trending/web dev    # 前端 (http://localhost:3000)
pnpm --filter @good-trending/api dev    # API (http://localhost:3001)
```

### 访问地址

| 服务     | 地址                           |
| -------- | ------------------------------ |
| Web 应用 | http://localhost:3000          |
| API 服务 | http://localhost:3001          |
| API 文档 | http://localhost:3001/api-docs |
| 健康检查 | http://localhost:3001/health   |

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
