# 重构进度日志

## 任务概述

**目标**: 彻底重构 apps/crawler 和 apps/scheduler，统一新架构
**开始日期**: 2026-03-19
**设计文档**: `docs/plans/2026-03-19-crawler-scheduler-refactor-design.md`

## 核心设计决策

### Crawler 重构

- 旧爬虫实现（services/google、reddit、amazon）**迁移**到 `adapters/legacy/` 目录
- 与 `adapters/crawlee/` 并列，通过 `domain/interfaces/` 统一接口约束
- `factories/` 负责切换实现（默认 legacy，可配置 crawlee）
- `services/` 保留三个无替代的模块：`ai/`、`crawler-data-processor.ts`、`social-mention-service.ts`
- 删除：`crawlers/BaseCrawler.ts`、`services/google-search-service.ts`、`services/reddit-service.ts`、`services/amazon-search-service.ts`、`types.ts`（顶层）

### Scheduler 重构

- 趋势任务迁移到 `jobs/trending-calculate/` 和 `jobs/trending-update/` 五文件结构
- `processors/trending/index.ts` 重写为策略路由模式（参考 crawler/index.ts）
- `processors/crawler/index.ts` 补充 `data-cleanup` 路由
- `scheduler/index.ts` 删除所有硬编码：legacyJobActions、calculate-trending、update-trending 硬编码调度
- 两个队列保持独立：`crawler-queue` 和 `trending-queue`
- `TrendingJobData` 类型保留（独立队列对应独立类型）

## 会话记录

### 会话 1 - 2026-03-19

- 完成架构分析（ADMEMS 方法）
- 编写设计文档
- 创建 Harness 任务目录和功能清单
- 尚未开始实施

## 关键文件路径参考

### Scheduler

- 入口: `apps/scheduler/src/index.ts`
- 队列: `apps/scheduler/src/queue/index.ts`
- 调度器: `apps/scheduler/src/scheduler/index.ts`
- 任务注册: `apps/scheduler/src/jobs/index.ts`
- 爬虫处理器: `apps/scheduler/src/processors/crawler/index.ts`
- 趋势处理器: `apps/scheduler/src/processors/trending/index.ts`
- 趋势计算（旧）: `apps/scheduler/src/processors/trending/calculator.ts`

### Crawler

- 入口: `apps/crawler/src/index.ts`
- 接口: `apps/crawler/src/domain/interfaces/`
- 旧实现（迁出前）: `apps/crawler/src/services/`
- 新架构目标: `apps/crawler/src/adapters/legacy/`
- crawlee 实现: `apps/crawler/src/adapters/crawlee/`
- 工厂: `apps/crawler/src/factories/`

### 参考实现（新架构样板）

- `apps/scheduler/src/jobs/category-heat/` — 爬虫任务的标准五文件结构
- `apps/scheduler/src/processors/crawler/index.ts` — 策略路由模式样板
- `apps/crawler/src/adapters/crawlee/google/google-search.crawler.ts` — crawlee 实现样板
