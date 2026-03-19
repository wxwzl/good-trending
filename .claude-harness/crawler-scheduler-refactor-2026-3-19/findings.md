# 问题记录

## 已知坑

### 1. RedditService 需要外部 Page 实例

**问题**: `RedditService.fetchPost(page, url)` 需要外部传入 `Page`，但 `IReddit` 接口定义的是 `fetchPost(url): Promise<RedditPost | null>`（不含 page）。

**当前处理**: `factories/reddit.factory.ts` 通过 `createRedditWithPage(page)` 工厂方法绕过，`LegacyRedditAdapter.fetchPost()` 直接抛出错误提示需要用 `createRedditWithPage`。

**迁移时注意**: 将 `RedditService` 迁移到 `adapters/legacy/reddit/reddit.crawler.ts` 后，需要保留此行为。可以考虑将 `page` 作为构造函数参数注入（而不是每次 fetchPost 传入），这样可以干净地实现 `IReddit` 接口。

### 2. data-cleanup 处理器未注册

**问题**: `processors/crawler/index.ts` 的 `jobHandlers` 缺少 `"data-cleanup"` 条目，该任务被调度后会报 `Unknown crawler source: data-cleanup`。

**修复**: 在 phase-2-5 中补充。

### 3. scheduler/index.ts 中的 addCrawlerJob 函数

**问题**: `addCrawlerJob` 使用旧的 `JOB_TYPES.CRAWL_CATEGORY_HEAT` 等常量，这些常量的值（如 `"crawl-category-heat"`）和新架构 job name（`"category-heat"`）不一致。此函数目前仅被 `triggerJob` 的 `legacyJobActions` 调用，删除 `legacyJobActions` 后可以一并删除。

### 4. 趋势处理器需要 TrendingJobData 类型

**问题**: `processors/trending/index.ts` 使用 `TrendingJobData` 和 `TrendingJobResult` 类型。重写为策略路由模式后，processor 的 job 类型需要确认。

**方案**: `trending-queue` 的 Worker 使用 `TrendingJobData`，处理器路由到具体 job 的 processor 时透传 job 数据。`jobs/trending-calculate/processor.ts` 和 `jobs/trending-update/processor.ts` 接收 `Job<TrendingJobData>` 类型。

## 待确认

- [ ] `apps/crawler/src/services/__tests__/` 中的测试文件，迁移后是否需要调整导入路径
- [ ] `apps/crawler/src/services/social-mention-service.ts` 是否用到了 `RedditService`（如果是，迁移后需更新导入）
