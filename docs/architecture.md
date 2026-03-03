# Good-Trending 架构设计文档

> 基于 ADMEMS 架构设计方法论

---

# 阶段一：Pre-Architecture（需求结构化阶段）

## 1.1 需求结构化（ADMEMS矩阵）

```
┌──────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│              │        功能需求          │        质量需求          │        约束需求          │
├──────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 业务级需求    │ • 爬取X平台热门商品      │ • SEO友好，页面收录快    │ • 遵守平台爬虫协议       │
│              │ • 爬取亚马逊热销商品     │ • 每日数据更新及时        │ • 数据合规使用          │
│              │ • 展示Trending趋势       │ • 系统可用性 99%+        │ • 预算有限（初期）       │
│              │ • 分类Topics聚合         │ • 页面加载速度 < 2s      │                         │
├──────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 用户级需求    │ • 浏览每日热门商品       │ • 界面清晰易用           │ • 用户访问设备不限       │
│              │ • 按分类/标签筛选        │ • 移动端适配良好         │ • 支持中英文切换         │
│              │ • 搜索商品              │ • 搜索响应快             │                         │
│              │ • 查看商品详情和历史趋势 │ • 历史数据可追溯         │                         │
│              │ • 中英文切换            │ • 支持明暗主题切换       │                         │
├──────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 开发级需求    │ • 定时爬虫任务          │ • 代码可维护性高         │ • 全栈TypeScript        │
│              │ • 数据存储与查询API     │ • 爬虫稳定性好           │ • Monorepo + TurboRepo  │
│              │ • 前后端API对接         │ • 系统可扩展             │ • pnpm 包管理           │
│              │ • 任务监控与告警        │ • 部署简单               │ • 技术栈已指定          │
└──────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

## 1.2 约束影响分析

```
约束: 全栈 TypeScript
├── 直接影响: 前后端、爬虫统一语言，类型共享
├── 间接影响: 可复用类型定义，减少接口文档维护
└── 隐含约束: 需要配置好 TypeScript monorepo 类型引用

约束: Monorepo + TurboRepo + pnpm
├── 直接影响: 项目结构需要按 workspace 组织
├── 间接影响: 共享包管理方便，构建可缓存加速
└── 隐含约束: 需要正确配置 workspace 依赖关系

约束: Next.js App Router（SEO核心）
├── 直接影响: 前端必须是 SSR/SSG 模式
├── 间接影响: 数据需要在构建时或请求时获取
└── 隐含约束: 需要考虑缓存策略和增量静态再生

约束: Playwright 爬虫
├── 直接影响: 爬虫需要无头浏览器环境
├── 间接影响: 资源消耗较大，需要考虑并发控制
└── 隐含约束: 需要处理反爬虫机制
```

## 1.3 关键质量目标

| 质量属性 | 目标值 | 优先级 | 验证方法 |
|---------|--------|--------|---------|
| SEO友好 | Core Web Vitals 全绿，Lighthouse SEO > 90 | 高 | Lighthouse 测试 |
| 页面性能 | LCP < 2.5s，FID < 100ms | 高 | 性能监控 |
| 爬虫稳定性 | 每日爬取成功率 > 95% | 高 | 任务日志监控 |
| 数据时效性 | 每日数据更新完成时间 < 6:00 AM | 高 | 监控告警 |
| 可用性 | 99%+ | 中 | 正常运行时间监控 |
| 可维护性 | 代码覆盖率 > 70% | 中 | 测试报告 |
| 测试覆盖率 | 单元测试 > 70%，集成测试 > 60%，E2E 覆盖核心流程 | 高 | Jest/Vitest 覆盖报告 |
| API 文档 | 100% 接口有 Swagger 文档 | 高 | Swagger UI 检查 |

## 1.4 关键功能识别

| 功能 | 业务价值 | 技术风险 | 使用频率 | 优先级 |
|-----|---------|---------|---------|--------|
| X平台爬虫 | 高 | 高（反爬） | 每日 | ★★★ |
| 亚马逊爬虫 | 高 | 中（反爬） | 每日 | ★★★ |
| Trending展示 | 高 | 低 | 高频 | ★★★ |
| Topics分类 | 高 | 低 | 高频 | ★★★ |
| SEO优化 | 高 | 中 | 持续 | ★★★ |
| 国际化 (中英文) | 高 | 低 | 持续 | ★★★ |
| 主题切换 | 中 | 低 | 持续 | ★★☆ |
| 定时调度 | 高 | 低 | 每日 | ★★☆ |
| 搜索功能 | 中 | 中 | 中频 | ★★☆ |
| 历史趋势 | 中 | 低 | 低频 | ★☆☆ |

---

# 阶段二：Conceptual Architecture（概念架构阶段）

## 2.1 初步设计（鲁棒图）

### 核心场景1：用户浏览 Trending 页面

```
[Trending页面] ──→ [Trending控制器] ──→ [商品实体]
      ↑                  │                   │
      │                  ↓                   ↓
[分页组件] ←─── [缓存服务] ←─── [数据仓库]
```

### 核心场景2：定时爬虫执行

```
[调度器触发] ──→ [爬虫控制器] ──→ [任务实体]
      │                │
      │                ↓
      │          [X平台采集]
      │                │
      │                ↓
      │          [亚马逊采集]
      │                │
      ↓                ↓
[告警服务] ←─── [数据清洗服务] ──→ [商品实体]
```

### 核心场景3：用户搜索商品

```
[搜索页面] ──→ [搜索控制器] ──→ [搜索索引]
      ↑                │
      │                ↓
[搜索结果] ←─── [商品仓库]
```

## 2.2 高层分割

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Good-Trending 系统                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     前端层 (Next.js)                              │   │
│  │  • SSR/SSG 页面渲染  • SEO 优化  • 响应式UI                        │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │ HTTP/REST                               │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                     API层 (NestJS)                                │   │
│  │  • RESTful API  • 数据聚合  • 缓存管理                             │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                     调度层 (BullMQ)                               │   │
│  │  • 定时任务  • 任务队列  • 重试机制                                │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                     爬虫层 (Playwright)                           │   │
│  │  • X平台爬虫  • 亚马逊爬虫  • 数据清洗                             │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────┴────────────────────────────────────┐   │
│  │                     数据层 (PostgreSQL + Redis)                   │   │
│  │  • PostgreSQL  • Redis  • Prisma ORM                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.3 分层架构策略

采用 **逻辑层（Layer）+ 通用性分层** 组合：

```
┌─────────────────────────────────────────────────────────────────┐
│                   表现层 - Next.js App Router                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  SSR Pages  │  │  SSG Pages  │  │  API Routes │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                   应用层 - NestJS                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  商品服务    │  │  趋势服务    │  │  搜索服务    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                   领域层 - 共享包 (@good-trending/shared)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  商品实体    │  │  趋势实体    │  │  分类实体    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                   基础设施层                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Prisma     │  │  Redis      │  │  BullMQ     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

# 阶段三：Refined Architecture（细化架构阶段）

## 3.1 逻辑架构

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 表现层 (Next.js)                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  首页          │  │  Trending页面  │  │  Topics页面    │  │  商品详情页    │  │
│  │  /            │  │  /trending    │  │  /topics/*    │  │  /product/*   │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                      │
│  │  搜索页面      │  │  分类页面      │  │  About页面     │                      │
│  │  /search      │  │  /category/*  │  │  /about       │                      │
│  └────────────────┘  └────────────────┘  └────────────────┘                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 API层 (NestJS)                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  商品控制器    │  │  趋势控制器    │  │  搜索控制器    │  │  分类控制器    │  │
│  │  /products    │  │  /trending    │  │  /search      │  │  /topics      │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                      │
│  │  健康检查      │  │  爬虫状态      │  │  统计分析      │                      │
│  │  /health      │  │  /crawler/*   │  │  /stats       │                      │
│  └────────────────┘  └────────────────┘  └────────────────┘                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 服务层                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  商品服务      │  │  趋势计算服务  │  │  搜索服务      │  │  分类服务      │  │
│  │  ProductService│  │  TrendService │  │  SearchService│  │  TopicService │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                      │
│  │  缓存服务      │  │  通知服务      │  │  SEO服务       │                      │
│  │  CacheService │  │  NotifyService│  │  SEOService   │                      │
│  └────────────────┘  └────────────────┘  └────────────────┘                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 爬虫层 (Playwright)                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐        │
│  │         X平台爬虫               │  │         亚马逊爬虫               │        │
│  │  XPlatformCrawler              │  │  AmazonCrawler                  │        │
│  │  ├── 关键词搜索                 │  │  ├── Best Sellers 爬取          │        │
│  │  ├── 热门话题提取               │  │  ├── 分类商品爬取               │        │
│  │  └── 商品链接提取               │  │  └── 商品详情爬取               │        │
│  └─────────────────────────────────┘  └─────────────────────────────────┘        │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐        │
│  │         数据清洗服务            │  │         代理管理                 │        │
│  │  DataCleanService              │  │  ProxyManager                   │        │
│  └─────────────────────────────────┘  └─────────────────────────────────┘        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 调度层                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                         BullMQ 任务队列                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │ X平台爬取队列 │  │ 亚马逊爬取队列│  │ 数据处理队列  │  │ 通知队列     │    │  │
│  │  │ x-crawler    │  │ amazon-crawler│ │ data-process │  │ notification │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                         调度器 (Node-cron)                                  │  │
│  │  • 每日凌晨 2:00 触发 X平台爬虫                                             │  │
│  │  • 每日凌晨 3:00 触发亚马逊爬虫                                             │  │
│  │  • 每日凌晨 5:00 计算趋势排名                                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                 数据层                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                              PostgreSQL                                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │  │
│  │  │  商品表     │  │  趋势表     │  │  分类表     │  │  爬虫日志  │            │  │
│  │  │  products  │  │  trends    │  │  topics    │  │  crawler_logs│           │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                            │  │
│  │  │  商品历史   │  │  来源映射   │  │  标签表     │                            │  │
│  │  │  histories │  │  sources   │  │  tags      │                            │  │
│  │  └────────────┘  └────────────┘  └────────────┘                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Redis                                       │  │
│  │  • 页面缓存（ISR）   • 任务队列存储    • 会话管理    • 热点数据缓存          │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 物理架构

```
                                    ┌─────────────────┐
                                    │     用户        │
                                    └────────┬────────┘
                                             │
                                    ┌────────↓────────┐
                                    │   CDN (可选)    │
                                    │  Cloudflare    │
                                    └────────┬────────┘
                                             │
┌────────────────────────────────────────────────────────────────────────────────┐
│                              应用服务器                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Next.js (Port 3000)                               │  │
│  │  • SSR/SSG 渲染  • API Routes  • ISR 缓存                                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         NestJS API (Port 3001)                            │  │
│  │  • RESTful API  • 业务逻辑  • 数据聚合                                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Crawler Worker                                    │  │
│  │  • Playwright 实例  • 爬虫执行  • 数据采集                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                         Scheduler (BullMQ)                                │  │
│  │  • 任务调度  • 队列管理  • 重试机制                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────↓────────┐      ┌────────↓────────┐      ┌────────↓────────┐
           │    PostgreSQL   │      │      Redis      │      │   文件存储      │
           │    (主数据库)    │      │   (缓存/队列)   │      │  (图片/静态)    │
           └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 部署方案（Docker Compose）

```yaml
services:
  # 前端服务
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - NEXT_PUBLIC_API_URL=http://api:3001
    depends_on:
      - db
      - redis

  # API服务
  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # 爬虫Worker
  crawler:
    build: ./apps/crawler
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # 调度器
  scheduler:
    build: ./apps/scheduler
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # 数据库
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=good_trending
      - POSTGRES_USER=...
      - POSTGRES_PASSWORD=...

  # 缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## 3.3 运行架构

### 控制流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            用户请求流程                                       │
└─────────────────────────────────────────────────────────────────────────────┘

用户请求 ──→ Next.js ──→ 检查ISR缓存 ──→ [命中?]
                              │
                    ┌─────────┴─────────┐
                    ↓ (未命中)           ↓ (命中)
            调用NestJS API         直接返回缓存
                    │
                    ↓
            检查Redis缓存 ──→ [命中?]
                    │
            ┌───────┴───────┐
            ↓ (未命中)       ↓ (命中)
        查询PostgreSQL    返回Redis数据
            │
            ↓
        写入Redis缓存
            │
            ↓
        返回渲染页面


┌─────────────────────────────────────────────────────────────────────────────┐
│                            定时爬虫流程                                       │
└─────────────────────────────────────────────────────────────────────────────┘

定时触发 ──→ 调度器 ──→ 创建任务队列 ──→ BullMQ分发
                                        │
                    ┌───────────────────┼───────────────────┐
                    ↓                   ↓                   ↓
            X平台爬虫Worker    亚马逊爬虫Worker    数据处理Worker
                    │                   │                   │
                    ↓                   ↓                   ↓
            启动Playwright     启动Playwright     数据清洗/去重
                    │                   │                   │
                    ↓                   ↓                   ↓
            执行爬取逻辑        执行爬取逻辑        计算趋势排名
                    │                   │                   │
                    ↓                   ↓                   ↓
            提取商品数据        提取商品数据        更新数据库
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        │
                                        ↓
                                发送通知(成功/失败)
```

### 并发模型

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js 进程模型                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  主进程     │  │  Worker 1   │  │  Worker 2   │  ...        │
│  │ (请求分发)  │  │ (SSR渲染)   │  │ (SSR渲染)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      爬虫并发模型                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   BullMQ 队列                            │   │
│  │  并发数: 3-5 (可配置)                                    │   │
│  │  ├── Worker 1 (Playwright 实例)                         │   │
│  │  ├── Worker 2 (Playwright 实例)                         │   │
│  │  └── Worker 3 (Playwright 实例)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  限流策略:                                                      │
│  • 每个请求间隔 2-5 秒                                          │
│  • 每小时最多 N 个请求                                          │
│  • 代理轮换                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 3.4 开发架构

### 项目结构

```
good-trending/
├── apps/                              # 应用程序
│   ├── web/                           # Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/                   # App Router 页面
│   │   │   │   ├── page.tsx           # 首页
│   │   │   │   ├── trending/
│   │   │   │   │   └── page.tsx       # Trending 页面
│   │   │   │   ├── topics/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx   # Topics 详情页
│   │   │   │   ├── product/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx   # 商品详情页
│   │   │   │   ├── search/
│   │   │   │   │   └── page.tsx       # 搜索页面
│   │   │   │   ├── layout.tsx         # 根布局
│   │   │   │   └── sitemap.ts         # SEO 站点地图
│   │   │   ├── components/            # React 组件
│   │   │   │   ├── ui/                # Shadcn/UI 组件
│   │   │   │   ├── layout/            # 布局组件
│   │   │   │   ├── product/           # 商品相关组件
│   │   │   │   └── trending/          # 趋势相关组件
│   │   │   ├── lib/                   # 工具函数
│   │   │   │   ├── api.ts             # API 客户端
│   │   │   │   ├── seo.ts             # SEO 工具
│   │   │   │   └── utils.ts           # 通用工具
│   │   │   └── styles/                # 样式文件
│   │   ├── public/                    # 静态资源
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json              # TypeScript 配置
│   │   └── package.json
│   │
│   ├── api/                           # NestJS API 服务
│   │   ├── src/
│   │   │   ├── modules/               # 功能模块
│   │   │   │   ├── product/           # 商品模块
│   │   │   │   │   ├── product.controller.ts
│   │   │   │   │   ├── product.service.ts
│   │   │   │   │   └── product.dto.ts
│   │   │   │   ├── trending/          # 趋势模块
│   │   │   │   ├── topic/             # 分类模块
│   │   │   │   ├── search/            # 搜索模块
│   │   │   │   └── crawler/           # 爬虫管理模块
│   │   │   ├── common/                # 公共模块
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   └── interceptors/
│   │   │   ├── config/                # 配置
│   │   │   ├── database/              # 数据库配置
│   │   │   └── main.ts                # 入口文件
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json              # TypeScript 配置
│   │   └── package.json
│   │
│   ├── crawler/                       # 爬虫应用
│   │   ├── src/
│   │   │   ├── crawlers/              # 爬虫实现
│   │   │   │   ├── base.crawler.ts    # 基础爬虫类
│   │   │   │   ├── x-platform.crawler.ts  # X平台爬虫
│   │   │   │   └── amazon.crawler.ts  # 亚马逊爬虫
│   │   │   ├── processors/            # 队列处理器
│   │   │   │   ├── x-crawler.processor.ts
│   │   │   │   └── amazon-crawler.processor.ts
│   │   │   ├── services/              # 爬虫服务
│   │   │   │   ├── proxy.service.ts   # 代理服务
│   │   │   │   ├── data-clean.service.ts  # 数据清洗
│   │   │   │   └── anti-detect.service.ts # 反检测
│   │   │   ├── utils/                 # 工具函数
│   │   │   └── main.ts                # 入口文件
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.json              # TypeScript 配置
│   │   └── package.json
│   │
│   └── scheduler/                     # 调度应用
│       ├── src/
│       │   ├── jobs/                  # 定时任务定义
│       │   │   ├── x-crawler.job.ts
│       │   │   ├── amazon-crawler.job.ts
│       │   │   └── trend-calculation.job.ts
│       │   ├── queue/                 # 队列配置
│       │   │   └── queue.module.ts
│       │   └── main.ts                # 入口文件
│       ├── tsconfig.json              # TypeScript 配置
│       └── package.json
│
├── packages/                          # 共享包
│   ├── shared/                        # 共享代码
│   │   ├── src/
│   │   │   ├── types/                 # TypeScript 类型定义
│   │   │   │   ├── product.ts
│   │   │   │   ├── trending.ts
│   │   │   │   └── topic.ts
│   │   │   ├── constants/             # 常量定义
│   │   │   └── utils/                 # 通用工具函数
│   │   ├── tsconfig.json              # TypeScript 配置
│   │   └── package.json
│   │
│   ├── database/                      # 数据库包
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Prisma Schema
│   │   ├── src/
│   │   │   └── index.ts               # 导出 Prisma Client
│   │   ├── tsconfig.json              # TypeScript 配置
│   │   └── package.json
│   │
│   └── eslint-config/                 # ESLint 配置
│       ├── base.js
│       ├── next.js
│       └── package.json
│
├── turbo.json                         # TurboRepo 配置
├── pnpm-workspace.yaml                # pnpm workspace 配置
├── package.json                       # 根 package.json
├── tsconfig.json                      # 根 TypeScript 配置 (基础配置)
├── .gitignore
├── .env.example                       # 环境变量示例
├── docker-compose.yml                 # Docker 编排
├── docker-compose.test.yml            # 测试环境 Docker 编排
└── .github/
    └── workflows/
        └── test.yml                   # CI/CD 测试流程
```

## 3.5 数据架构

### Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 商品表
model Product {
  id          String   @id @default(cuid())
  name        String
  description String?
  image       String?
  price       Decimal?
  currency    String   @default("USD")
  sourceUrl   String   @unique
  sourceId    String   // 来源平台的商品ID
  sourceType  SourceType

  // 关联
  topics      ProductTopic[]
  tags        ProductTag[]
  trends      Trend[]
  histories   ProductHistory[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sourceType, sourceId])
  @@index([createdAt])
}

// 商品-分类关联
model ProductTopic {
  productId String
  topicId   String

  product   Product @relation(fields: [productId], references: [id])
  topic     Topic   @relation(fields: [topicId], references: [id])

  @@id([productId, topicId])
}

// 分类/Topics
model Topic {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  imageUrl    String?

  products    ProductTopic[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([slug])
}

// 标签
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  slug      String   @unique

  products  ProductTag[]

  @@index([slug])
}

// 商品-标签关联
model ProductTag {
  productId String
  tagId     String

  product   Product @relation(fields: [productId], references: [id])
  tag       Tag     @relation(fields: [tagId], references: [id])

  @@id([productId, tagId])
}

// 趋势记录
model Trend {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])

  date        DateTime @db.Date
  rank        Int
  score       Float    // 综合热度分数
  mentions    Int      @default(0)  // 提及次数
  views       Int      @default(0)  // 浏览量
  likes       Int      @default(0)  // 点赞数

  sourceData  Json?    // 原始数据快照

  createdAt   DateTime @default(now())

  @@unique([productId, date])
  @@index([date, rank])
  @@index([date, score])
}

// 商品历史数据
model ProductHistory {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])

  date        DateTime @db.Date
  price       Decimal?
  rank        Int?
  salesCount  Int?
  reviewCount Int?
  rating      Float?

  createdAt   DateTime @default(now())

  @@unique([productId, date])
  @@index([productId, date])
}

// 爬虫日志
model CrawlerLog {
  id          String   @id @default(cuid())
  sourceType  SourceType
  status      CrawlerStatus

  startTime   DateTime
  endTime     DateTime?
  duration    Int?     // 毫秒

  itemsFound  Int      @default(0)
  itemsSaved  Int      @default(0)
  errors      Json?

  metadata    Json?

  createdAt   DateTime @default(now())

  @@index([sourceType, createdAt])
}

// 数据来源类型
enum SourceType {
  X_PLATFORM
  AMAZON
}

// 爬虫状态
enum CrawlerStatus {
  RUNNING
  COMPLETED
  FAILED
}
```

### 数据分布策略

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据存储策略                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PostgreSQL (持久化存储)                                         │
│  ├── 商品数据：核心数据，需要持久化                               │
│  ├── 趋势数据：按日期分区，便于查询历史                           │
│  ├── 分类数据：相对静态，关联查询频繁                             │
│  └── 爬虫日志：用于监控和审计                                    │
│                                                                 │
│  Redis (缓存层)                                                 │
│  ├── 页面缓存：ISR 缓存 HTML                                     │
│  ├── 热点数据：今日 trending 数据                                │
│  ├── 任务队列：BullMQ 存储任务状态                               │
│  └── API缓存：频繁查询的商品数据                                 │
│                                                                 │
│  CDN/对象存储 (静态资源)                                         │
│  └── 商品图片、静态资源                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.6 国际化架构 (i18n)

### 技术选型

| 技术 | 用途 | 特点 |
|-----|------|------|
| **next-intl** | Next.js 国际化框架 | App Router 原生支持，服务端组件友好 |
| **@formatjs/intl-localematcher** | 语言匹配 | 处理语言协商 |
| **negotiator** | 内容协商 | 解析 Accept-Language |

### 语言配置

```
支持的语言:
├── en (English)      - 默认语言
└── zh (简体中文)     - 中文

URL 结构:
├── /                    → 重定向到 /en 或 /zh (根据浏览器语言)
├── /en                  → 英文首页
├── /en/trending         → 英文 Trending 页面
├── /zh                  → 中文首页
├── /zh/trending         → 中文 Trending 页面
└── ...
```

### 国际化目录结构

```
apps/web/
├── src/
│   ├── app/
│   │   └── [locale]/                # 动态语言路由
│   │       ├── layout.tsx           # 语言布局
│   │       ├── page.tsx             # 首页
│   │       ├── trending/
│   │       │   └── page.tsx
│   │       ├── topics/
│   │       │   └── [slug]/
│   │       │       └── page.tsx
│   │       ├── product/
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       └── search/
│   │           └── page.tsx
│   │
│   ├── i18n/                        # 国际化配置
│   │   ├── config.ts                # 语言配置
│   │   ├── request.ts               # 服务端配置
│   │   ├── routing.ts               # 路由配置
│   │   └── middleware.ts            # 语言检测中间件
│   │
│   └── ...
│
├── messages/                        # 翻译资源文件 (按需加载)
│   ├── en/                          # 英文资源
│   │   ├── common.json              # 通用文案
│   │   ├── home.json                # 首页
│   │   ├── trending.json            # Trending 页面
│   │   ├── topics.json              # Topics 页面
│   │   ├── product.json             # 商品详情页
│   │   ├── search.json              # 搜索页面
│   │   └── errors.json              # 错误信息
│   │
│   └── zh/                          # 中文资源
│       ├── common.json
│       ├── home.json
│       ├── trending.json
│       ├── topics.json
│       ├── product.json
│       ├── search.json
│       └── errors.json
│
├── middleware.ts                    # Next.js 中间件 (语言检测)
└── next.config.js
```

### 国际化配置代码

#### 语言配置

```typescript
// src/i18n/config.ts
export const locales = ['en', 'zh'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '简体中文',
}

export const localeLabels: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  zh: { native: '简体中文', english: 'Simplified Chinese' },
}
```

#### 路由配置

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always', // 始终显示语言前缀 /en, /zh
})

// 创建类型安全的导航助手
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

#### 服务端配置

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { locales, Locale } from './config'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // 获取当前语言
  let locale = await requestLocale

  // 验证语言是否有效
  if (!locale || !locales.includes(locale as Locale)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    // 按需加载翻译资源
    messages: {
      common: (await import(`../../messages/${locale}/common.json`)).default,
      ...(locale === 'zh'
        ? { home: (await import(`../../messages/${locale}/home.json`)).default }
        : {}),
    },
  }
})
```

#### 中间件配置

```typescript
// src/i18n/middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './routing'

export default createMiddleware(routing)

export const config = {
  // 匹配所有路径，除了 api、_next、静态文件等
  matcher: ['/', '/(en|zh)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

```typescript
// middleware.ts (根目录)
import { middleware as i18nMiddleware } from './src/i18n/middleware'

export default i18nMiddleware

export const config = {
  matcher: ['/', '/(en|zh)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

### 翻译资源示例

#### common.json (英文)

```json
{
  "siteName": "Good Trending",
  "siteDescription": "Discover trending products from X and Amazon",
  "navigation": {
    "home": "Home",
    "trending": "Trending",
    "topics": "Topics",
    "search": "Search",
    "about": "About"
  },
  "actions": {
    "viewDetails": "View Details",
    "loadMore": "Load More",
    "search": "Search",
    "filter": "Filter",
    "sort": "Sort",
    "share": "Share"
  },
  "theme": {
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "language": {
    "title": "Language",
    "en": "English",
    "zh": "简体中文"
  },
  "footer": {
    "copyright": "© {year} Good Trending. All rights reserved.",
    "poweredBy": "Powered by Next.js"
  }
}
```

#### common.json (中文)

```json
{
  "siteName": "好物趋势",
  "siteDescription": "发现 X 平台和亚马逊的热门商品趋势",
  "navigation": {
    "home": "首页",
    "trending": "热门趋势",
    "topics": "分类",
    "search": "搜索",
    "about": "关于"
  },
  "actions": {
    "viewDetails": "查看详情",
    "loadMore": "加载更多",
    "search": "搜索",
    "filter": "筛选",
    "sort": "排序",
    "share": "分享"
  },
  "theme": {
    "light": "浅色",
    "dark": "深色",
    "system": "跟随系统"
  },
  "language": {
    "title": "语言",
    "en": "English",
    "zh": "简体中文"
  },
  "footer": {
    "copyright": "© {year} 好物趋势. 保留所有权利.",
    "poweredBy": "由 Next.js 驱动"
  }
}
```

#### trending.json (英文)

```json
{
  "title": "Trending Products",
  "subtitle": "Discover what's hot today",
  "lastUpdated": "Last updated: {date}",
  "noResults": "No trending products found",
  "rank": "Rank #{rank}",
  "score": "Trending Score",
  "source": {
    "title": "Source",
    "x_platform": "X Platform",
    "amazon": "Amazon"
  },
  "filters": {
    "all": "All",
    "today": "Today",
    "thisWeek": "This Week",
    "thisMonth": "This Month"
  }
}
```

#### trending.json (中文)

```json
{
  "title": "热门商品",
  "subtitle": "发现今日热门趋势",
  "lastUpdated": "最后更新: {date}",
  "noResults": "暂无热门商品",
  "rank": "排名 #{rank}",
  "score": "热度指数",
  "source": {
    "title": "来源",
    "x_platform": "X 平台",
    "amazon": "亚马逊"
  },
  "filters": {
    "all": "全部",
    "today": "今天",
    "thisWeek": "本周",
    "thisMonth": "本月"
  }
}
```

### 组件使用示例

```tsx
// src/app/[locale]/trending/page.tsx
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Locale } from '@/i18n/config'

interface TrendingPageProps {
  params: { locale: Locale }
}

export default async function TrendingPage({ params: { locale } }: TrendingPageProps) {
  // 启用静态渲染
  setRequestLocale(locale)

  // 加载页面特定翻译
  const t = await getTranslations({ locale, namespace: 'trending' })
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <p>{t('lastUpdated', { date: new Date().toLocaleDateString() })}</p>
      {/* ... */}
    </main>
  )
}

// 生成静态路径
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}
```

```tsx
// 客户端组件使用
'use client'

import { useTranslations } from 'next-intl'

export function LanguageSwitcher() {
  const t = useTranslations('common.language')
  const { locale, setLocale } = useLocale()

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="en">{t('en')}</option>
      <option value="zh">{t('zh')}</option>
    </select>
  )
}
```

### SEO 多语言优化

```tsx
// src/app/[locale]/layout.tsx
import { locales, Locale } from '@/i18n/config'

export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'common' })

  return {
    title: {
      default: t('siteName'),
      template: `%s | ${t('siteName')}`,
    },
    description: t('siteDescription'),
    alternates: {
      canonical: `https://good-trending.com/${locale}`,
      languages: Object.fromEntries(
        locales.map((l) => [l, `https://good-trending.com/${l}`])
      ),
    },
  }
}
```

### sitemap.xml 多语言

```tsx
// src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://good-trending.com'
  const routes = ['', '/trending', '/topics', '/search', '/about']

  const sitemapEntries: MetadataRoute.Sitemap = []

  locales.forEach((locale) => {
    routes.forEach((route) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${route}`])
          ),
        },
      })
    })
  })

  return sitemapEntries
}
```

---

## 3.7 主题系统架构

### 技术选型

| 技术 | 用途 | 特点 |
|-----|------|------|
| **next-themes** | 主题管理 | SSR 友好，无闪烁 |
| **Tailwind CSS** | 主题样式 | dark: 前缀，CSS 变量支持 |
| **Shadcn/UI** | 组件主题 | 内置 dark/light 主题支持 |

### 主题配置

```
支持的主题:
├── light     - 浅色主题 (默认)
├── dark      - 深色主题
└── system    - 跟随系统
```

### 主题目录结构

```
apps/web/
├── src/
│   ├── components/
│   │   ├── providers/
│   │   │   └── ThemeProvider.tsx    # 主题 Provider
│   │   └── ui/
│   │       ├── theme-toggle.tsx     # 主题切换按钮
│   │       └── theme-dropdown.tsx   # 主题下拉选择
│   │
│   ├── styles/
│   │   ├── globals.css              # 全局样式 + CSS 变量
│   │   └── themes/
│   │       ├── light.css            # 浅色主题变量
│   │       └── dark.css             # 深色主题变量
│   │
│   └── lib/
│       └── themes.ts                # 主题配置
│
└── tailwind.config.js               # Tailwind 主题配置
```

### 主题 CSS 变量

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* 浅色主题 - Shadcn/UI 标准 */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* 自定义品牌色 */
    --brand-primary: 217 91% 60%;
    --brand-secondary: 262 83% 58%;
    --brand-accent: 142 71% 45%;

    /* 状态色 */
    --success: 142 76% 36%;
    --warning: 38 92% 50%;
    --error: 0 84% 60%;
  }

  .dark {
    /* 深色主题 */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;

    /* 自定义品牌色 - 深色模式 */
    --brand-primary: 217 91% 60%;
    --brand-secondary: 262 83% 58%;
    --brand-accent: 142 71% 45%;

    /* 状态色 */
    --success: 142 76% 36%;
    --warning: 38 92% 50%;
    --error: 0 72% 51%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Tailwind 配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
          accent: 'hsl(var(--brand-accent))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### ThemeProvider 配置

```tsx
// src/components/providers/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
```

### 根布局集成

```tsx
// src/app/[locale]/layout.tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Locale } from '@/i18n/config'

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: Locale }
}) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 主题切换组件

```tsx
// src/components/ui/theme-toggle.tsx
'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // 避免水合不匹配
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 多语言主题切换

```tsx
// src/components/ui/theme-dropdown.tsx
'use client'

import * as React from 'react'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const

export function ThemeDropdown() {
  const { setTheme, theme } = useTheme()
  const t = useTranslations('common.theme')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const currentTheme = themes.find((t) => t.value === theme) || themes[0]
  const Icon = currentTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Icon className="h-5 w-5" />
          <span className="sr-only">{t('title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map(({ value, icon: ThemeIcon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center">
              <ThemeIcon className="mr-2 h-4 w-4" />
              {t(value)}
            </span>
            {theme === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 防止闪烁的脚本

```tsx
// 在 <head> 中添加内联脚本，防止页面加载时的主题闪烁
// src/app/[locale]/layout.tsx

export default function RootLayout({ children, params: { locale } }) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'system';
                if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 主题相关测试

```tsx
// __tests__/components/ThemeToggle.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ThemeProvider } from 'next-themes'

const wrapper = ({ children }) => (
  <ThemeProvider attribute="class">{children}</ThemeProvider>
)

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    render(<ThemeToggle />, { wrapper })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows theme options when clicked', async () => {
    render(<ThemeToggle />, { wrapper })

    fireEvent.click(screen.getByRole('button'))

    expect(await screen.findByText('Light')).toBeInTheDocument()
    expect(await screen.findByText('Dark')).toBeInTheDocument()
    expect(await screen.findByText('System')).toBeInTheDocument()
  })
})
```

---

## 3.8 测试体系架构

### 测试架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           测试体系架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     apps/tests (独立测试应用)                         │   │
│  │  ├── e2e/                    # E2E 测试 (Playwright)                 │   │
│  │  │   ├── web/                # 前端 E2E 测试                         │   │
│  │  │   └── api/                # API 接口 E2E 测试                      │   │
│  │  ├── api/                    # API 集成测试 (Vitest)                  │   │
│  │  ├── fixtures/               # 测试数据                               │   │
│  │  ├── mocks/                  # Mock 文件                              │   │
│  │  └── utils/                  # 测试工具                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     各应用内部的单元测试                               │   │
│  │  ├── apps/web/__tests__/          # 前端单元/组件测试 (Vitest)         │   │
│  │  ├── apps/api/test/               # API 单元测试 (Jest)               │   │
│  │  ├── apps/crawler/__tests__/      # 爬虫单元测试 (Vitest)              │   │
│  │  └── apps/scheduler/__tests__/    # 调度器单元测试 (Vitest)            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 测试金字塔

```
                        ┌─────────────┐
                        │   E2E 测试   │  ← Playwright (apps/tests)
                        │   (10%)     │     少量，覆盖核心流程
                        └──────┬──────┘
                               │
                   ┌───────────┴───────────┐
                   │    API 集成测试        │  ← Vitest (apps/tests)
                   │       (30%)           │     中等，覆盖 API 接口
                   └───────────┬───────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │              单元测试                    │  ← 各应用内部
          │               (60%)                     │     大量，覆盖业务逻辑
          └─────────────────────────────────────────┘
```

### 测试技术栈

| 测试类型 | 工具 | 位置 | 适用范围 |
|---------|------|------|---------|
| **单元测试** | Vitest / Jest | 各应用内部 | 函数、组件、Service 层 |
| **API 集成测试** | Vitest + fetch | `apps/tests/api/` | API 接口端到端测试 |
| **E2E 测试 (Web)** | Playwright | `apps/tests/e2e/web/` | 完整用户流程 |
| **E2E 测试 (API)** | Playwright | `apps/tests/e2e/api/` | API 端到端测试 |
| **快照测试** | Vitest | 各应用内部 | UI 组件渲染 |
| **Mock** | MSW + vi.fn() | `apps/tests/mocks/` | 外部依赖模拟 |
| **覆盖率** | c8 / Istanbul | 各应用内部 | 代码覆盖率统计 |

### 测试目录结构

```
good-trending/
├── apps/
│   ├── tests/                              # 独立测试应用 (与 web, api 同级)
│   │   ├── src/
│   │   │   │
│   │   │   ├── e2e/                        # E2E 测试 (Playwright)
│   │   │   │   ├── web/                    # 前端 E2E 测试
│   │   │   │   │   ├── user-journey.spec.ts      # 用户完整流程
│   │   │   │   │   ├── trending.spec.ts          # Trending 页面测试
│   │   │   │   │   ├── product-detail.spec.ts    # 商品详情测试
│   │   │   │   │   ├── search.spec.ts            # 搜索功能测试
│   │   │   │   │   ├── theme.spec.ts             # 主题切换测试
│   │   │   │   │   └── i18n.spec.ts              # 国际化测试
│   │   │   │   │
│   │   │   │   └── api/                    # API E2E 测试
│   │   │   │       ├── products.e2e-spec.ts      # 商品 API 测试
│   │   │   │       ├── trending.e2e-spec.ts      # 趋势 API 测试
│   │   │   │       ├── topics.e2e-spec.ts        # 分类 API 测试
│   │   │   │       ├── search.e2e-spec.ts        # 搜索 API 测试
│   │   │   │       └── health.e2e-spec.ts        # 健康检查测试
│   │   │   │
│   │   │   ├── api/                        # API 集成测试 (Vitest)
│   │   │   │   ├── products/
│   │   │   │   │   ├── get-products.test.ts
│   │   │   │   │   ├── get-product-by-id.test.ts
│   │   │   │   │   └── create-product.test.ts
│   │   │   │   ├── trending/
│   │   │   │   │   └── get-trending.test.ts
│   │   │   │   ├── topics/
│   │   │   │   │   └── get-topics.test.ts
│   │   │   │   └── search/
│   │   │   │       └── search-products.test.ts
│   │   │   │
│   │   │   ├── fixtures/                   # 测试数据工厂
│   │   │   │   ├── product.fixture.ts
│   │   │   │   ├── trend.fixture.ts
│   │   │   │   ├── topic.fixture.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── mocks/                      # Mock 文件
│   │   │   │   ├── handlers/               # MSW handlers
│   │   │   │   │   ├── product.handler.ts
│   │   │   │   │   ├── trending.handler.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── server.ts               # MSW server
│   │   │   │   └── db.mock.ts              # 数据库 Mock
│   │   │   │
│   │   │   └── utils/                      # 测试工具
│   │   │       ├── api-client.ts           # API 测试客户端
│   │   │       ├── db-setup.ts             # 数据库设置
│   │   │       ├── test-helpers.ts         # 通用测试助手
│   │   │       └── assertions.ts           # 自定义断言
│   │   │
│   │   ├── playwright.config.ts            # Playwright E2E 配置
│   │   ├── vitest.config.ts                # Vitest API 测试配置
│   │   ├── vitest.setup.ts                 # Vitest 设置文件
│   │   ├── tsconfig.json                   # TypeScript 配置
│   │   └── package.json
│   │
│   ├── web/                                # Next.js 前端
│   │   ├── src/
│   │   │   └── ...
│   │   ├── __tests__/                      # 前端单元/组件测试
│   │   │   ├── unit/
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProductCard.test.tsx
│   │   │   │   │   ├── TrendingList.test.tsx
│   │   │   │   │   └── ThemeToggle.test.tsx
│   │   │   │   └── lib/
│   │   │   │       ├── api.test.ts
│   │   │   │       ├── seo.test.ts
│   │   │   │       └── utils.test.ts
│   │   │   └── setup.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   ├── api/                                # NestJS API
│   │   ├── src/
│   │   │   └── ...
│   │   ├── test/                           # API 单元测试
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   │   ├── product.service.spec.ts
│   │   │   │   │   ├── trending.service.spec.ts
│   │   │   │   │   └── cache.service.spec.ts
│   │   │   │   └── utils/
│   │   │   │       └── helpers.spec.ts
│   │   │   └── mocks/
│   │   │       ├── prisma.mock.ts
│   │   │       └── redis.mock.ts
│   │   ├── jest.config.js
│   │   └── package.json
│   │
│   ├── crawler/                            # 爬虫应用
│   │   ├── src/
│   │   │   └── ...
│   │   ├── __tests__/                      # 爬虫单元测试
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   │   ├── data-clean.service.test.ts
│   │   │   │   │   └── proxy.service.test.ts
│   │   │   │   └── utils/
│   │   │   │       └── parser.test.ts
│   │   │   └── mocks/
│   │   │       ├── pages/
│   │   │       │   ├── x-platform.html
│   │   │       │   └── amazon.html
│   │   │       └── responses/
│   │   │           └── product-response.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── scheduler/                          # 调度应用
│       ├── src/
│       │   └── ...
│       ├── __tests__/                      # 调度器单元测试
│       │   ├── unit/
│       │   │   └── jobs/
│       │   │       ├── x-crawler.job.test.ts
│       │   │       └── amazon-crawler.job.test.ts
│       │   └── integration/
│       │       └── queue.test.ts
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   ├── __tests__/
│   │   │   └── utils/
│   │   │       └── helpers.test.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── database/
│       ├── src/
│       ├── __tests__/
│       │   └── validators/
│       │       └── product.validator.test.ts
│       ├── vitest.config.ts
│       └── package.json
│
└── ...
```

### apps/tests 独立测试应用配置

#### package.json

```json
{
  "name": "@good-trending/tests",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:api": "vitest run",
    "test:api:watch": "vitest",
    "test:api:ui": "vitest --ui",
    "test:all": "pnpm test:api && pnpm test:e2e",
    "report:show": "playwright show-report"
  },
  "dependencies": {
    "@good-trending/shared": "workspace:*",
    "@good-trending/database": "workspace:*"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "msw": "^2.0.0",
    "@faker-js/faker": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### Playwright 配置 (apps/tests)

```typescript
// apps/tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    apiURL: process.env.API_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // 前端 E2E 测试
    {
      name: 'web-chromium',
      testDir: './src/e2e/web',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-firefox',
      testDir: './src/e2e/web',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'web-mobile',
      testDir: './src/e2e/web',
      use: { ...devices['Pixel 5'] },
    },
    // API E2E 测试
    {
      name: 'api-tests',
      testDir: './src/e2e/api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 前端 E2E 需要启动 web 服务
  webServer: {
    command: 'pnpm --filter @good-trending/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

#### Vitest 配置 (apps/tests)

```typescript
// apps/tests/vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/api/**/*.test.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/fixtures/',
        'src/mocks/',
        'src/utils/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fixtures': path.resolve(__dirname, './src/fixtures'),
      '@mocks': path.resolve(__dirname, './src/mocks'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
})
```

#### Vitest Setup (apps/tests)

```typescript
// apps/tests/vitest.setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { server } from './src/mocks/server'

// 启动 MSW Server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// 重置 handlers
afterEach(() => server.resetHandlers())

// 关闭 MSW Server
afterAll(() => server.close())
```

### 测试用例示例

#### API 集成测试 (apps/tests)

```typescript
// apps/tests/src/api/products/get-products.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient } from '@utils/api-client'
import { productFixture } from '@fixtures/product.fixture'

describe('GET /products', () => {
  describe('成功的请求', () => {
    it('应该返回分页的商品列表', async () => {
      const response = await apiClient.get('/products', {
        params: { page: 1, limit: 10 },
      })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(10)
      expect(typeof response.body.total).toBe('number')
    })

    it('应该支持按来源筛选', async () => {
      const response = await apiClient.get('/products', {
        params: { sourceType: 'AMAZON' },
      })

      expect(response.status).toBe(200)
      response.body.data.forEach((product) => {
        expect(product.sourceType).toBe('AMAZON')
      })
    })

    it('应该支持关键词搜索', async () => {
      const response = await apiClient.get('/products', {
        params: { keyword: 'laptop' },
      })

      expect(response.status).toBe(200)
      response.body.data.forEach((product) => {
        expect(
          product.name.toLowerCase().includes('laptop') ||
          product.description?.toLowerCase().includes('laptop')
        ).toBe(true)
      })
    })
  })

  describe('参数验证', () => {
    it('应该拒绝无效的 page 参数', async () => {
      const response = await apiClient.get('/products', {
        params: { page: -1 },
      })

      expect(response.status).toBe(400)
    })

    it('应该限制 limit 最大值为 100', async () => {
      const response = await apiClient.get('/products', {
        params: { limit: 200 },
      })

      expect(response.status).toBe(200)
      expect(response.body.limit).toBeLessThanOrEqual(100)
    })
  })
})
```

```typescript
// apps/tests/src/api/products/get-product-by-id.test.ts
import { describe, it, expect } from 'vitest'
import { apiClient } from '@utils/api-client'

describe('GET /products/:id', () => {
  it('应该返回指定商品的详情', async () => {
    // 先创建测试商品或使用已存在的
    const productId = 'test-product-id'

    const response = await apiClient.get(`/products/${productId}`)

    expect(response.status).toBe(200)
    expect(response.body.id).toBe(productId)
    expect(response.body.name).toBeDefined()
    expect(response.body.sourceUrl).toBeDefined()
  })

  it('应该返回 404 当商品不存在时', async () => {
    const response = await apiClient.get('/products/non-existent-id')

    expect(response.status).toBe(404)
    expect(response.body.message).toContain('not found')
  })
})
```

#### E2E 测试 - 前端 (apps/tests)

```typescript
// apps/tests/src/e2e/web/user-journey.spec.ts
import { test, expect } from '@playwright/test'

test.describe('用户完整流程', () => {
  test('应该从首页浏览到商品详情', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/en')
    await expect(page).toHaveTitle(/Good Trending/)

    // 2. 点击 Trending 导航
    await page.click('[data-testid="nav-trending"]')
    await expect(page).toHaveURL(/\/en\/trending/)

    // 3. 等待商品列表加载
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()

    // 4. 点击第一个商品
    const firstProduct = productCards.first()
    const productName = await firstProduct.locator('h3').textContent()
    await firstProduct.click()

    // 5. 验证跳转到详情页
    await expect(page).toHaveURL(/\/en\/product\//)
    await expect(page.locator('h1')).toContainText(productName || '')
  })

  test('应该完成搜索流程', async ({ page }) => {
    await page.goto('/en')

    // 输入搜索词
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill('laptop')
    await searchInput.press('Enter')

    // 验证搜索结果页
    await expect(page).toHaveURL(/\/en\/search\?q=laptop/)
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  })
})
```

```typescript
// apps/tests/src/e2e/web/theme.spec.ts
import { test, expect } from '@playwright/test'

test.describe('主题切换', () => {
  test('应该切换到深色主题', async ({ page }) => {
    await page.goto('/en')

    // 打开主题下拉菜单
    await page.click('[data-testid="theme-toggle"]')

    // 选择深色主题
    await page.click('text=Dark')

    // 验证 html 元素有 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('应该记住主题偏好', async ({ page, context }) => {
    await page.goto('/en')

    // 设置深色主题
    await page.click('[data-testid="theme-toggle"]')
    await page.click('text=Dark')
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 刷新页面
    await page.reload()

    // 验证主题被记住
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
```

```typescript
// apps/tests/src/e2e/web/i18n.spec.ts
import { test, expect } from '@playwright/test'

test.describe('国际化', () => {
  test('应该切换到中文', async ({ page }) => {
    await page.goto('/en')

    // 打开语言切换
    await page.click('[data-testid="language-switcher"]')

    // 选择中文
    await page.click('text=简体中文')

    // 验证 URL 和内容
    await expect(page).toHaveURL(/\/zh/)
    await expect(page.locator('nav')).toContainText('首页')
  })

  test('应该根据浏览器语言自动重定向', async ({ browser }) => {
    // 创建中文浏览器上下文
    const context = await browser.newContext({
      locale: 'zh-CN',
    })
    const page = await context.newPage()

    // 访问根路径
    await page.goto('/')

    // 应该重定向到中文
    await expect(page).toHaveURL(/\/zh/)

    await context.close()
  })
})
```

#### E2E 测试 - API (apps/tests)

```typescript
// apps/tests/src/e2e/api/products.e2e-spec.ts
import { test, expect } from '@playwright/test'

test.describe('Products API E2E', () => {
  test('GET /products 应该返回商品列表', async ({ request }) => {
    const response = await request.get('/api/products', {
      params: { page: 1, limit: 10 },
    })

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.data).toBeInstanceOf(Array)
    expect(body.page).toBe(1)
  })

  test('GET /products/:id 应该返回商品详情', async ({ request }) => {
    // 先获取一个商品 ID
    const listResponse = await request.get('/api/products', {
      params: { limit: 1 },
    })
    const { data } = await listResponse.json()

    if (data.length > 0) {
      const response = await request.get(`/api/products/${data[0].id}`)
      expect(response.ok()).toBeTruthy()
      const product = await response.json()
      expect(product.id).toBe(data[0].id)
    }
  })

  test('POST /products 应该创建新商品 (需要认证)', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: {
        name: 'Test Product',
        sourceUrl: 'https://example.com/test-product',
        sourceId: 'test-123',
        sourceType: 'AMAZON',
      },
    })

    // 未认证应该返回 401
    expect(response.status()).toBe(401)
  })
})
```

### 测试工具函数 (apps/tests)

```typescript
// apps/tests/src/utils/api-client.ts
import fetch from 'node-fetch'

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001'

interface RequestOptions {
  params?: Record<string, string | number>
  headers?: Record<string, string>
  body?: unknown
}

export const apiClient = {
  async get(path: string, options: RequestOptions = {}) {
    const url = new URL(`${API_BASE_URL}/api${path}`)
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const body = await response.json()
    return { status: response.status, body }
  },

  async post(path: string, data: unknown, options: RequestOptions = {}) {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
    })

    const body = await response.json()
    return { status: response.status, body }
  },
}
```

```typescript
// apps/tests/src/fixtures/product.fixture.ts
import { faker } from '@faker-js/faker'
import { SourceType } from '@good-trending/database'

export const productFixture = {
  single: (overrides?: Partial<Product>) => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    image: faker.image.url(),
    price: parseFloat(faker.commerce.price()),
    currency: 'USD',
    sourceUrl: faker.internet.url(),
    sourceId: faker.string.uuid(),
    sourceType: faker.helpers.enumValue(SourceType),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }),

  many: (count: number, overrides?: Partial<Product>) => {
    return Array.from({ length: count }, () => productFixture.single(overrides))
  },
}
```

### MSW Mock 配置 (apps/tests)

```typescript
// apps/tests/src/mocks/handlers/product.handler.ts
import { http, HttpResponse } from 'msw'
import { productFixture } from '@fixtures/product.fixture'

export const productHandlers = [
  http.get('*/api/products', () => {
    return HttpResponse.json({
      data: productFixture.many(10),
      total: 100,
      page: 1,
      limit: 10,
    })
  }),

  http.get('*/api/products/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json(productFixture.single({ id }))
  }),
]
```

```typescript
// apps/tests/src/mocks/server.ts
import { setupServer } from 'msw/node'
import { productHandlers } from './handlers/product.handler'
import { trendingHandlers } from './handlers/trending.handler'

export const server = setupServer(
  ...productHandlers,
  ...trendingHandlers
)
```

### 测试命令

```bash
# 在 apps/tests 目录下运行

# E2E 测试
pnpm test:e2e              # 运行所有 E2E 测试
pnpm test:e2e:ui           # UI 模式运行 E2E 测试
pnpm test:e2e:debug        # 调试模式
pnpm test:e2e -- --project=web-chromium  # 只运行 chromium

# API 集成测试
pnpm test:api              # 运行 API 集成测试
pnpm test:api:watch        # 监听模式
pnpm test:api:ui           # UI 模式

# 运行所有测试
pnpm test:all

# 查看报告
pnpm report:show
```

### CI/CD 配置更新

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # 单元测试 - 各应用内部
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: |
          pnpm --filter @good-trending/web test:unit
          pnpm --filter @good-trending/api test:unit
          pnpm --filter @good-trending/crawler test:unit

  # API 集成测试 + E2E 测试 - 独立测试应用
  integration-and-e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Setup test database
        run: pnpm --filter @good-trending/database prisma:migrate:deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db

      - name: Install Playwright browsers
        run: pnpm --filter @good-trending/tests exec playwright install --with-deps

      - name: Run API integration tests
        run: pnpm --filter @good-trending/tests test:api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          API_URL: http://localhost:3001

      - name: Run E2E tests
        run: pnpm --filter @good-trending/tests test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          E2E_BASE_URL: http://localhost:3000
          API_URL: http://localhost:3001

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: apps/tests/playwright-report/
```

### Mock 策略

#### Prisma Mock (API 单元测试)

```typescript
// apps/api/test/mocks/prisma.mock.ts
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
```

#### MSW API Mock (apps/tests)

```typescript
// apps/tests/src/mocks/handlers/product.handler.ts
import { http, HttpResponse } from 'msw'
import { productFixture } from '@fixtures/product.fixture'

export const productHandlers = [
  http.get('*/api/products', () => {
    return HttpResponse.json({
      data: productFixture.many(10),
      total: 100,
      page: 1,
      limit: 10,
    })
  }),

  http.get('*/api/products/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json(productFixture.single({ id }))
  }),

  http.get('*/api/trending', () => {
    return HttpResponse.json({
      data: productFixture.many(20),
      date: new Date().toISOString(),
    })
  }),
]
```

---

## 3.9 API 文档架构 (Swagger)

### Swagger 集成配置

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  )

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('Good-Trending API')
    .setDescription('商品趋势追踪平台 API 文档')
    .setVersion('1.0')
    .addTag('products', '商品相关接口')
    .addTag('trending', '趋势相关接口')
    .addTag('topics', '分类相关接口')
    .addTag('search', '搜索相关接口')
    .addTag('crawler', '爬虫管理接口')
    .addBearerAuth()
    .addServer('http://localhost:3001', '开发环境')
    .addServer('https://api.good-trending.com', '生产环境')
    .build()

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace('Controller', '')}_${methodKey}`,
  })

  // 自定义 Swagger UI 路径
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Good-Trending API Docs',
  })

  // 导出 OpenAPI JSON (用于测试工具导入)
  if (process.env.NODE_ENV !== 'production') {
    const fs = await import('fs')
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2))
  }

  await app.listen(3001)
}
bootstrap()
```

### DTO 装饰器规范

```typescript
// apps/api/src/modules/product/dto/product.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { SourceType } from '@prisma/client'

// ==================== 基础 DTO ====================

export class ProductDto {
  @ApiProperty({
    description: '商品唯一标识',
    example: 'clx123456789',
  })
  id: string

  @ApiProperty({
    description: '商品名称',
    example: 'Apple MacBook Pro 14"',
  })
  name: string

  @ApiPropertyOptional({
    description: '商品描述',
    example: '最新款 MacBook Pro，搭载 M3 芯片',
  })
  description?: string

  @ApiPropertyOptional({
    description: '商品图片 URL',
    example: 'https://example.com/image.jpg',
  })
  image?: string

  @ApiPropertyOptional({
    description: '商品价格',
    example: 1999.99,
  })
  price?: number

  @ApiProperty({
    description: '货币单位',
    example: 'USD',
    default: 'USD',
  })
  currency: string

  @ApiProperty({
    description: '来源平台商品链接',
    example: 'https://amazon.com/dp/B0XXXXXXX',
  })
  sourceUrl: string

  @ApiProperty({
    description: '来源平台商品 ID',
    example: 'B0XXXXXXX',
  })
  sourceId: string

  @ApiProperty({
    description: '数据来源类型',
    enum: SourceType,
    example: SourceType.AMAZON,
  })
  sourceType: SourceType

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-16T08:20:00Z',
  })
  updatedAt: Date
}

// ==================== 查询 DTO ====================

export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10
}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '数据来源类型筛选',
    enum: SourceType,
    example: SourceType.AMAZON,
  })
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType

  @ApiPropertyOptional({
    description: '分类 ID 筛选',
    example: 'clx123456789',
  })
  @IsString()
  @IsOptional()
  topicId?: string

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'laptop',
  })
  @IsString()
  @IsOptional()
  keyword?: string
}

export class TrendingQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '日期筛选 (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsDateString()
  @IsOptional()
  date?: string

  @ApiPropertyOptional({
    description: '分类筛选',
    example: 'electronics',
  })
  @IsString()
  @IsOptional()
  topic?: string
}

// ==================== 响应 DTO ====================

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: '数据列表',
    type: [ProductDto],
  })
  data: T[]

  @ApiProperty({
    description: '总数量',
    example: 100,
  })
  total: number

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  limit: number

  @ApiProperty({
    description: '总页数',
    example: 10,
  })
  totalPages: number
}

export class TrendingResponseDto {
  @ApiProperty({
    description: '商品列表 (含趋势信息)',
    type: [ProductDto],
  })
  products: ProductDto[]

  @ApiProperty({
    description: '趋势日期',
    example: '2024-01-15',
  })
  date: string

  @ApiProperty({
    description: '数据更新时间',
    example: '2024-01-15T06:00:00Z',
  })
  updatedAt: string
}

// ==================== 创建/更新 DTO ====================

export class CreateProductDto {
  @ApiProperty({
    description: '商品名称',
    example: 'Apple MacBook Pro 14"',
  })
  @IsString()
  name: string

  @ApiPropertyOptional({
    description: '商品描述',
    example: '最新款 MacBook Pro',
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional({
    description: '商品图片 URL',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsOptional()
  image?: string

  @ApiPropertyOptional({
    description: '商品价格',
    example: 1999.99,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  price?: number

  @ApiProperty({
    description: '来源平台商品链接',
    example: 'https://amazon.com/dp/B0XXXXXXX',
  })
  @IsString()
  sourceUrl: string

  @ApiProperty({
    description: '来源平台商品 ID',
    example: 'B0XXXXXXX',
  })
  @IsString()
  sourceId: string

  @ApiProperty({
    description: '数据来源类型',
    enum: SourceType,
    example: SourceType.AMAZON,
  })
  @IsEnum(SourceType)
  sourceType: SourceType
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Controller 装饰器示例

```typescript
// apps/api/src/modules/product/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ProductService } from './product.service'
import {
  ProductDto,
  ProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  PaginatedResponseDto,
} from './dto/product.dto'

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({
    summary: '获取商品列表',
    description: '支持分页、筛选和搜索',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取商品列表',
    type: PaginatedResponseDto<ProductDto>,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query)
  }

  @Get('trending')
  @ApiOperation({
    summary: '获取热门商品',
    description: '获取指定日期的热门趋势商品',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: '日期 (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取热门商品',
  })
  async getTrending(
    @Query('date') date?: string,
    @Query('limit') limit?: number
  ) {
    return this.productService.getTrending({ date, limit })
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取商品详情',
    description: '根据 ID 获取单个商品的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clx123456789',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取商品详情',
    type: ProductDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id)
  }

  @Post()
  @ApiOperation({
    summary: '创建商品',
    description: '手动创建一个新商品（管理员功能）',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '商品创建成功',
    type: ProductDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '商品已存在',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto)
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新商品',
    description: '更新指定商品的信息',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clx123456789',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '商品更新成功',
    type: ProductDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productService.update(id, updateProductDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除商品',
    description: '删除指定的商品',
  })
  @ApiParam({
    name: 'id',
    description: '商品 ID',
    example: 'clx123456789',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '商品删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '商品不存在',
  })
  async remove(@Param('id') id: string) {
    return this.productService.remove(id)
  }
}
```

### API 文档示例

#### 访问地址

- **开发环境**: `http://localhost:3001/api-docs`
- **生产环境**: `https://api.good-trending.com/api-docs`
- **OpenAPI JSON**: `http://localhost:3001/api-docs-json`

#### 接口列表

| 方法 | 路径 | 描述 |
|-----|------|------|
| GET | `/products` | 获取商品列表（分页） |
| GET | `/products/trending` | 获取热门趋势商品 |
| GET | `/products/:id` | 获取商品详情 |
| POST | `/products` | 创建商品 |
| PUT | `/products/:id` | 更新商品 |
| DELETE | `/products/:id` | 删除商品 |
| GET | `/trending` | 获取今日趋势 |
| GET | `/trending/:date` | 获取指定日期趋势 |
| GET | `/topics` | 获取分类列表 |
| GET | `/topics/:slug` | 获取分类详情 |
| GET | `/topics/:slug/products` | 获取分类下商品 |
| GET | `/search` | 搜索商品 |
| GET | `/crawler/status` | 获取爬虫状态 |
| POST | `/crawler/trigger` | 手动触发爬虫 |
| GET | `/health` | 健康检查 |

### 测试用例导出

Swagger 文档可用于生成测试用例：

```typescript
// 从 OpenAPI JSON 生成 Postman Collection
// 使用工具: openapi-to-postmanv2

// 或导入到:
// - Postman: Import → Upload openapi.json
// - Insomnia: Import → From File
// - Hoppscotch: Import → OpenAPI
```

---

# 非功能需求："目标-场景-决策"表

| 目标 | 场景 | 决策 | 状态 |
|-----|------|-----|------|
| SEO友好 | Google爬虫索引页面 | 1. 使用 Next.js SSR/SSG<br>2. 动态生成 sitemap.xml<br>3. 结构化数据 (JSON-LD)<br>4. 语义化 HTML | 设计完成 |
| 页面性能 | 用户访问 Trending 页面 | 1. ISR 增量静态再生<br>2. Redis 缓存热点数据<br>3. 图片懒加载<br>4. 代码分割 | 设计完成 |
| 爬虫稳定性 | X平台反爬虫检测 | 1. Playwright 隐身模式<br>2. 代理轮换<br>3. 随机延迟<br>4. 浏览器指纹模拟 | 设计完成 |
| 爬虫稳定性 | 亚马逊页面结构变化 | 1. 多选择器容错<br>2. 异常监控告警<br>3. 数据验证机制 | 设计完成 |
| 数据时效性 | 每日数据更新 | 1. BullMQ 定时调度<br>2. 任务失败重试<br>3. 完成后触发 ISR revalidate | 设计完成 |
| 可用性 | 单点故障 | 1. Docker 容器自动重启<br>2. 健康检查接口<br>3. 降级策略（展示缓存数据） | 设计完成 |

---

# 架构设计总结

## 技术栈确认

| 层级 | 技术选型 | 职责 |
|-----|---------|-----|
| **前端** | Next.js 14+ (App Router) + Shadcn/UI | SSR/SSG 渲染，SEO 优化 |
| **API** | NestJS + Swagger | RESTful API，业务逻辑，接口文档 |
| **爬虫** | Playwright + TypeScript | 数据采集 |
| **调度** | BullMQ + Redis | 定时任务，队列管理 |
| **数据库** | PostgreSQL + Prisma | 数据持久化 |
| **缓存** | Redis | 页面缓存，队列存储 |
| **构建** | TurboRepo + pnpm | Monorepo 管理 |
| **单元测试** | Vitest (前端) + Jest (后端) | 函数、组件、Service 测试 |
| **集成测试** | Jest + Supertest | API 接口、数据库测试 |
| **E2E 测试** | Playwright | 完整用户流程测试 |
| **Mock** | MSW + jest-mock-extended | API 和依赖模拟 |
| **测试数据** | @faker-js/faker | 测试数据生成 |
| **国际化** | next-intl | 多语言支持，资源按需加载 |
| **主题系统** | next-themes + Tailwind CSS | 明暗主题切换 |

## 核心设计决策

1. **Monorepo 结构**：统一管理前后端和爬虫代码，共享类型定义
2. **ISR 缓存策略**：平衡 SEO 和性能，减少服务器压力
3. **BullMQ 任务队列**：可靠的爬虫调度和重试机制
4. **Playwright 爬虫**：应对动态页面和反爬虫
5. **测试金字塔**：60% 单元测试 + 30% 集成测试 + 10% E2E 测试
6. **Swagger 文档**：自动生成 API 文档，支持测试工具导入
7. **国际化设计**：基于 URL 路由 (`/en`, `/zh`)，翻译资源按页面按需加载
8. **主题系统**：CSS 变量 + Tailwind dark: 前缀，支持系统跟随

## 测试命令一览

```bash
# 运行所有单元测试
pnpm test:unit

# 运行所有集成测试
pnpm test:integration

# 运行 E2E 测试
pnpm test:e2e

# 运行所有测试
pnpm test

# 生成测试覆盖率报告
pnpm test:coverage

# UI 模式运行测试
pnpm test:ui
```

## API 文档访问

- 开发环境: http://localhost:3001/api-docs
- OpenAPI JSON: http://localhost:3001/api-docs-json

## 下一步建议

1. 按照上述架构创建项目结构
2. 优先实现核心爬虫和数据存储
3. 再实现前端展示和 API
4. 配置 Swagger 文档
5. 实现国际化 (next-intl) 和主题切换 (next-themes)
6. 编写测试用例
7. 最后完善 SEO 优化和监控

## 国际化配置

- 支持语言: `en` (English), `zh` (简体中文)
- URL 结构: `/en/trending`, `/zh/trending`
- 资源加载: 按页面按需加载翻译文件

## 主题切换

- 支持主题: `light` (浅色), `dark` (深色), `system` (跟随系统)
- 技术实现: CSS 变量 + Tailwind dark: 前缀 + next-themes
- 防闪烁: 内联脚本在 `<head>` 中提前应用主题
