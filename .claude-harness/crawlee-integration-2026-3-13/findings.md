# Crawlee 集成任务 - 问题记录

## 技术决策记录

### 决策 1: 为什么保持 services/ 目录不动？
**日期**: 2026-03-13
**问题**: 是否应该将现有代码迁移到新的目录结构？
**决策**: 保持 services/ 完全不动，通过适配器包装
**原因**:
1. 向后兼容 - 现有代码无需修改即可工作
2. 降低风险 - 避免修改已验证的代码
3. 渐进迁移 - 可以逐步验证新实现

---

### 决策 2: AI 服务如何处理？
**日期**: 2026-03-13
**问题**: 新的 Crawlee Reddit 爬虫如何与 AI 分析服务集成？
**决策**: AI 服务 (`services/ai/`) 完全不变
**原因**:
1. AI 分析器只依赖 `RedditPost` 数据结构的 title/content/comments
2. Crawlee RedditCrawler 返回相同的 `RedditPost` 格式
3. 调用方式 `aiAnalyzer.analyze(post)` 完全相同

---

## 遇到的问题

### 问题 1: 暂无
**描述**:
**解决方案**:
**状态**:

---

## 关键代码片段

### RedditPost 类型兼容性
```typescript
// services/ai/ai-analyzer.interface.ts (现有)
export interface RedditPost {
  title: string;
  content?: string;
  comments: string[];
}

// domain/types/crawler.types.ts (新增)
export interface RedditPost {
  title: string;
  content?: string;
  comments: string[];
  url: string;        // 新增，但 AI 服务会忽略
  author?: string;    // 新增，但 AI 服务会忽略
  postedAt?: string;  // 新增，但 AI 服务会忽略
  upvotes?: number;   // 新增，但 AI 服务会忽略
}
```

TypeScript 兼容性：✅ 完全兼容，新增可选字段不影响现有代码
