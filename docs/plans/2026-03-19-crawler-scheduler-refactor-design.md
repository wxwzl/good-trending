# Crawler & Scheduler 架构重构设计文档

**日期**: 2026-03-19
**背景**: 当前 scheduler 存在新旧架构并存问题，crawler 的旧实现（services/）和新实现（adapters/crawlee/）分裂，需要彻底重构，统一架构，同时保留旧实现的优秀爬取效果。

---

## 一、需求结构化（Pre-Architecture）

### 1.1 关键功能需求

| 功能           | 说明                                                | 优先级 |
| -------------- | --------------------------------------------------- | ------ |
| 统一调度架构   | scheduler 所有任务统一使用新架构（jobs/ 模块化）    | P0     |
| 统一爬虫架构   | crawler 所有实现统一在 adapters/ 目录，通过接口约束 | P0     |
| 保留旧爬虫效果 | 将 services/ 里的旧实现迁移到 adapters/legacy/      | P0     |
| 保留双队列并行 | crawler-queue 和 trending-queue 保持独立            | P1     |
| 删除兼容代码   | 删除 legacyJobActions、硬编码调度等过渡代码         | P0     |

### 1.2 质量目标

| 质量属性 | 目标                          | 验证方式     |
| -------- | ----------------------------- | ------------ |
| 可维护性 | 代码模块化，职责单一          | 代码审查     |
| 可测试性 | 接口隔离，便于 Mock           | 单元测试覆盖 |
| 可扩展性 | 新增任务只需在 jobs/ 添加模块 | 新增任务时间 |

### 1.3 约束条件

| 约束类型 | 描述                     | 影响                                      |
| -------- | ------------------------ | ----------------------------------------- |
| 直接约束 | 必须保留旧爬虫的爬取效果 | 不能删除 services/ 里的核心逻辑，需要迁移 |
| 直接约束 | 两个队列必须独立         | 不能合并队列，保持并行能力                |
| 技术约束 | Drizzle ORM 不支持分区表 | schema 里需要注释说明                     |

---

## 二、概念架构（Conceptual Architecture）

### 2.1 鲁棒图分析

**关键场景：执行任务**

```
[调度器] ──→ [任务分发器] ──→ [爬虫 Job]
                │                    │
                │                    ↓
                │               [工厂层]
                │                    │
                │          ┌─────────┴─────────┐
                │          ↓                   ↓
                │    [Legacy 实现]        [Crawlee 实现]
                │          │                   │
                │          ↓                   ↓
                │    [Google/Reddit]     [Google/Reddit]
                │
                └─→ [趋势 Job]
                     │
                     ↓
               [分数计算器]
                     │
                     ↓
               [数据库写入]
```

### 2.2 高层分割

**分层策略（Layer）:**

```
┌─────────────────────────────────────────┐
│  调度层 (Scheduler)                      │
│  - jobs/ 任务模块                        │
│  - processors/ 处理器路由                │
│  - scheduler/ 定时调度器                 │
├─────────────────────────────────────────┤
│  适配器层 (Crawler Adapters)             │
│  - domain/interfaces/ 统一接口           │
│  - adapters/legacy/ 旧实现（默认）       │
│  - adapters/crawlee/ 新实现（备用）      │
│  - factories/ 实现切换                   │
├─────────────────────────────────────────┤
│  领域层 (Domain)                         │
│  - types/ 数据类型                       │
│  - errors/ 错误体系                      │
├─────────────────────────────────────────┤
│  基础设施层 (Infrastructure)             │
│  - stealth 脚本                          │
│  - User-Agent 管理                       │
│  - 延迟工具                              │
└─────────────────────────────────────────┘
```

### 2.3 分区策略

**同层按功能分区:**

```
adapters/
├── legacy/              # 分区：旧实现
│   ├── base/            # 子分区：基础能力
│   ├── google/          # 子分区：Google 搜索
│   ├── reddit/          # 子分区：Reddit
│   └── amazon/          # 子分区：Amazon
│
└── crawlee/             # 分区：新实现
    ├── base/
    ├── google/
    ├── reddit/
    └── amazon/
```

---

## 三、细化架构（Refined Architecture）

### 3.1 逻辑架构

**模块划分:**

```
apps/scheduler/src/
├── jobs/                          # 业务模块分区
│   ├── category-heat/             # 类目热度
│   ├── product-discovery/         # 商品发现
│   ├── product-mentions/          # 商品提及
│   ├── yesterday-stats/           # 昨日统计
│   ├── data-cleanup/              # 数据清理
│   ├── ai-product-discovery/      # AI 商品发现
│   ├── trending-calculate/        # 新增：趋势计算
│   └── trending-update/           # 新增：趋势更新
│
├── processors/                    # 处理器层
│   ├── crawler/                   # 爬虫任务路由
│   │   └── index.ts               # 策略路由到 jobs/
│   └── trending/                  # 趋势任务路由
│       └── index.ts               # 策略路由到 jobs/
│
├── scheduler/                     # 调度层
│   └── index.ts                   # 纯净调度器（动态注册）
│
└── queue/                         # 队列层
    └── index.ts                   # Crawler/Trending 两个队列

apps/crawler/src/
├── domain/                        # 领域层
│   ├── interfaces/                # 接口契约
│   │   ├── google-search.interface.ts
│   │   ├── reddit.interface.ts
│   │   └── amazon-search.interface.ts
│   ├── types/                     # 领域类型
│   └── errors/                    # 领域错误
│
├── adapters/                      # 适配器层（核心变更）
│   ├── legacy/                    # 旧实现（迁入）
│   │   ├── base/
│   │   │   └── BaseLegacyCrawler.ts    # 原 crawlers/BaseCrawler.ts
│   │   ├── google/
│   │   │   └── google-search.crawler.ts # 原 services/google-search-service.ts
│   │   ├── reddit/
│   │   │   └── reddit.crawler.ts       # 原 services/reddit-service.ts
│   │   └── amazon/
│   │       └── amazon.crawler.ts       # 原 services/amazon-search-service.ts
│   └── crawlee/                   # 新实现（保留）
│       ├── base/
│       ├── google/
│       ├── reddit/
│       └── amazon/
│
├── factories/                     # 工厂层
│   ├── google-search.factory.ts
│   ├── reddit.factory.ts
│   └── amazon-search.factory.ts
│
├── infrastructure/                # 基础设施
│   ├── browser/
│   └── utils/
│
└── services/                      # 保留服务（无替代）
    ├── ai/                        # AI 分析
    ├── crawler-data-processor.ts  # 数据持久化
    └── social-mention-service.ts  # 社交提及
```

### 3.2 物理架构

**部署结构不变:**

```
┌─────────────────┐
│  scheduler 容器  │  → 启动两个 Worker（crawler-queue, trending-queue）
│  - jobs/         │
│  - processors/   │
└────────┬────────┘
         │
         ↓ BullMQ + Redis
┌────────┴────────┐
│  crawler 作为库  │  → 被 scheduler jobs 调用
│  - adapters/     │
│  - domain/       │
└─────────────────┘
```

### 3.3 运行架构

**控制流:**

```
1. 调度触发（node-cron）
   ↓
2. 添加任务到队列（BullMQ）
   ↓
3. Worker 取出任务
   ↓
4. 处理器路由（根据 job.name）
   ├─→ 爬虫任务 → jobs/{name}/processor.ts → 调用 crawler adapters
   └─→ 趋势任务 → jobs/{name}/processor.ts → 计算/更新趋势
   ↓
5. 工厂选择实现（legacy | crawlee）
   ↓
6. 执行爬取
   ↓
7. 数据处理 → services/crawler-data-processor.ts
   ↓
8. 写入数据库
```

### 3.4 数据架构

**数据流:**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  爬取数据    │ ──→ │  数据处理器  │ ──→ │  分区表写入  │
│  (Playwright)│     │  (processor)│     │  (Drizzle)  │
└─────────────┘     └─────────────┘     └─────────────┘
                                                  │
       ┌──────────────────────────────────────────┤
       ↓                                          ↓
┌─────────────┐                          ┌─────────────┐
│ product_social_stat                    │ trend_ranks │
│ (分区表)     │                          │ (榜单数据)  │
└─────────────┘                          └─────────────┘
```

---

## 四、非功能需求处理

### 4.1 目标-场景-决策表

| 目标           | 场景                   | 决策                                                         |
| -------------- | ---------------------- | ------------------------------------------------------------ |
| 保留旧爬虫效果 | 需要高质量的爬取结果   | 将 services/ 旧实现迁入 adapters/legacy/，保持原有反检测逻辑 |
| 架构一致性     | 所有任务统一组织方式   | 趋势任务也按 jobs/{name}/ 五文件结构组织                     |
| 队列独立性     | 爬虫和趋势任务互不阻塞 | 保留 crawler-queue 和 trending-queue 两个独立队列            |

---

## 五、变更清单

### 5.1 文件移动/重构

| 原路径                                            | 新路径                                                        | 操作           |
| ------------------------------------------------- | ------------------------------------------------------------- | -------------- |
| `crawler/src/crawlers/BaseCrawler.ts`             | `crawler/src/adapters/legacy/base/BaseLegacyCrawler.ts`       | 移动           |
| `crawler/src/services/google-search-service.ts`   | `crawler/src/adapters/legacy/google/google-search.crawler.ts` | 移动+适配接口  |
| `crawler/src/services/reddit-service.ts`          | `crawler/src/adapters/legacy/reddit/reddit.crawler.ts`        | 移动+适配接口  |
| `crawler/src/services/amazon-search-service.ts`   | `crawler/src/adapters/legacy/amazon/amazon.crawler.ts`        | 移动+适配接口  |
| `scheduler/src/processors/trending/calculator.ts` | `scheduler/src/jobs/trending-calculate/calculator.ts`         | 移动+拆分      |
| `scheduler/src/processors/trending/index.ts`      | `scheduler/src/processors/trending/index.ts`                  | 重写为策略路由 |

### 5.2 新增文件

| 路径                                          | 说明                                                     |
| --------------------------------------------- | -------------------------------------------------------- |
| `scheduler/src/jobs/trending-calculate/`      | 五文件结构（index/scheduler/processor/calculator/types） |
| `scheduler/src/jobs/trending-update/`         | 五文件结构（index/scheduler/processor/updater/types）    |
| `crawler/src/adapters/legacy/google/index.ts` | 模块导出                                                 |
| `crawler/src/adapters/legacy/reddit/index.ts` | 模块导出                                                 |
| `crawler/src/adapters/legacy/amazon/index.ts` | 模块导出                                                 |

### 5.3 删除文件

| 路径                                              | 说明                   |
| ------------------------------------------------- | ---------------------- |
| `crawler/src/types.ts`                            | 过时类型定义           |
| `crawler/src/crawlers/`                           | 目录删除（内容已迁移） |
| `crawler/src/services/google-search-service.ts`   | 迁移后删除             |
| `crawler/src/services/reddit-service.ts`          | 迁移后删除             |
| `crawler/src/services/amazon-search-service.ts`   | 迁移后删除             |
| `scheduler/src/processors/trending/calculator.ts` | 迁移后删除             |

### 5.4 修改文件

| 路径                                        | 修改内容                                   |
| ------------------------------------------- | ------------------------------------------ |
| `scheduler/src/jobs/index.ts`               | 注册 trending-calculate 和 trending-update |
| `scheduler/src/processors/crawler/index.ts` | 添加 data-cleanup 路由                     |
| `scheduler/src/processors/index.ts`         | 添加 trending 处理器导出                   |
| `scheduler/src/scheduler/index.ts`          | 删除硬编码调度、删除 legacyJobActions      |
| `scheduler/src/queue/index.ts`              | 保留 TrendingJobData 独立类型              |
| `scheduler/src/index.ts`                    | 初始化两个 Worker（crawler + trending）    |
| `crawler/src/factories/*.ts`                | 更新导入路径                               |
| `crawler/src/index.ts`                      | 更新导出路径                               |

---

## 六、实施检查清单

### Pre-Architecture 检查点

- [x] 需求结构化完成（关键功能/质量/约束）
- [x] 约束影响分析完成
- [x] 关键质量目标确定
- [x] 关键功能识别完成

### Conceptual Architecture 检查点

- [x] 鲁棒图绘制完成
- [x] 高层分割完成
- [x] 分层策略确定
- [x] 非功能需求纳入概念设计

### Refined Architecture 检查点

- [x] 逻辑架构设计完成
- [x] 物理架构设计完成
- [x] 运行架构设计完成
- [x] 数据架构设计完成

---

## 七、参考

- ADMEMS 架构设计方法论（温昱）
- 当前代码结构（见本文档分析）
