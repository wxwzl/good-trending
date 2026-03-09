# SerpAPI 集成指南

## 概述

爬虫现在支持两种 Google 搜索模式：
1. **SerpAPI**（推荐）- 稳定、快速、不会被阻止
2. **浏览器爬取**（备用）- 免费但容易被 Google 反爬虫阻止

## 获取 SerpAPI Key

1. 访问 [SerpAPI 官网](https://serpapi.com/)
2. 注册账号（支持 Google/GitHub 登录）
3. 进入 [Dashboard](https://serpapi.com/dashboard)
4. 复制 API Key

### 免费额度

- **每月 100 次免费搜索**
- 足够开发和测试使用
- 超出后需要付费（$50/5000次）

## 配置方法

### 方法 1: 环境变量（推荐）

在 `.env.development` 文件中添加：

```bash
# SerpAPI 配置
SERPAPI_KEY=your_api_key_here
```

### 方法 2: 代码中配置

```typescript
const crawler = new GoogleSearchCrawler(
  {},
  {
    serpApiKey: "your_api_key_here",
  }
);
```

## 使用示例

### 使用 SerpAPI（默认）

```bash
# 设置环境变量后运行
pnpm crawl:products
```

### 强制使用浏览器（测试反爬虫）

```bash
# 在代码中设置 forceBrowser: true
```

### 测试搜索服务

```bash
# 测试 SerpAPI 和浏览器回退
pnpm crawl:test-serpapi
```

## 工作原理

```
搜索请求
    │
    ▼
┌─────────────────┐
│  尝试 SerpAPI   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  成功      失败/额度用完
    │         │
    ▼         ▼
 返回结果   回退到浏览器
              │
              ▼
           浏览器爬取
              │
              ▼
           返回结果
```

## 监控额度使用

在 [SerpAPI Dashboard](https://serpapi.com/dashboard) 可以查看：
- 本月已使用次数
- 剩余免费额度
- API 调用历史

## 故障排查

### 问题：一直使用浏览器模式

**原因**：
- 未设置 `SERPAPI_KEY`
- API Key 无效
- 免费额度已用完

**解决**：
1. 检查 `.env.development` 是否包含 `SERPAPI_KEY`
2. 确认 API Key 正确
3. 查看 Dashboard 确认额度

### 问题：SerpAPI 返回错误

**常见错误**：
- `quota exceeded` - 额度已用完
- `rate limit` - 请求太频繁
- `invalid api key` - API Key 无效

**解决**：
- 额度用完会自动回退到浏览器模式
- 降低请求频率
- 检查 API Key

## 最佳实践

1. **开发阶段**：使用免费额度（100次/月）
2. **生产环境**：购买付费计划或实现请求缓存
3. **错误处理**：始终处理 SerpAPI 失败的情况
4. **监控**：定期检查额度使用情况

## 代码示例

```typescript
import { GoogleSearchService } from "./services/google-search-service";

// 创建搜索服务
const searchService = new GoogleSearchService({
  serpApi: {
    apiKey: process.env.SERPAPI_KEY || "",
  },
  browser: {
    headless: true,
  },
});

// 执行搜索（自动选择最佳方式）
const result = await searchService.search(
  "site:reddit.com headphones after:2024-01-01"
);

console.log(`搜索来源: ${result.source}`); // serpapi 或 browser
console.log(`结果数: ${result.links.length}`);
```

## 相关文件

- `apps/crawler/src/services/google-search-service.ts` - 搜索服务
- `apps/crawler/src/google/google-search-crawler.ts` - 爬虫实现
- `apps/crawler/src/test-serpapi.ts` - 测试脚本
