# Crawlee 爬虫框架集成方案（方案A）

> **版本**: 1.0
> **日期**: 2026-03-13
> **状态**: 待确认

---

## 一、方案概述

### 1.1 目标

- **保留现有服务**: `apps/crawler/src/services/` 下所有现有服务**保持完全不变**
- **新增 Crawlee 实现**: 在 `apps/crawler/src/adapters/crawlee/` 下创建基于 Crawlee 的新爬虫
- **提取公共层**: 在 `apps/crawler/src/infrastructure/` 下放共享的公共服务和工具
- **无缝切换**: 调度器可通过配置在 Legacy 和 Crawlee 实现间切换
- **AI 服务兼容**: AI 分析服务 (`services/ai/`) **无需修改**，与爬虫实现解耦

### 1.2 设计原则

1. **向后兼容**: 所有现有代码无需修改即可继续工作
2. **接口一致**: Crawlee 实现提供与现有服务相同的接口
3. **渐进迁移**: 支持按任务逐步切换实现
4. **共享逻辑**: 提取通用的反检测、工具函数到 infrastructure 层
5. **AI 服务解耦**: AI 分析服务与爬虫实现完全解耦，数据格式兼容

---

## 二、架构设计

### 2.1 架构模式: Ports & Adapters

采用**端口-适配器模式（Ports & Adapters）**，调度器只依赖接口，不关心具体实现：

```
┌─────────────────────────────────────────────────────────────┐
│                      调度器 (Scheduler)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  爬虫工厂    │  │   AI 分析器  │  │      其他服务        │ │
│  │  (create)   │  │ (createAI)  │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
│         │                │                                   │
│         ↓                │                                   │
│  ┌─────────────┐         │                                   │
│  │  爬虫接口    │         │                                   │
│  │  (fetch)    │─────────┼───► 分析结果                     │
│  └─────────────┘         │                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      接口层 (domain/interfaces)              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  IGoogleSearch  │  │    IReddit      │                   │
│  │  - search()     │  │  - fetchPost()  │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ↓               ↓               ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Legacy      │ │     Crawlee     │ │    Factory      │
│   (services/)   │ │   (adapters/)   │ │  (factories/)   │
│   【现有，不动】  │ │   【新增】       │ │   【新增】       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 基础设施层 (infrastructure/)                 │
│         公共工具、反检测脚本、类型定义                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
apps/crawler/src/
│
├── index.ts                              # 统一出口（新增 Crawlee 导出）
│
├── domain/                               # 【新增】领域层 - 接口与类型
│   ├── interfaces/
│   │   ├── google-search.interface.ts    # Google 搜索接口
│   │   ├── reddit.interface.ts           # Reddit 接口
│   │   └── index.ts
│   └── types/
│       └── crawler.types.ts              # 领域类型（从现有 types/ 迁移）
│
├── infrastructure/                       # 【新增】基础设施层 - 公共工具
│   ├── browser/
│   │   ├── stealth-scripts.ts            # 反检测脚本（从现有服务提取）
│   │   ├── user-agents.ts                # User-Agent 列表
│   │   └── index.ts
│   ├── utils/
│   │   ├── delay.ts                      # 延迟/随机化工具
│   │   ├── bitmap.ts                     # Bitmap 工具（从现有 utils/ 迁移）
│   │   └── index.ts
│   └── index.ts
│
├── services/                             # 【现有，完全不动】所有现有服务
│   ├── index.ts                          # 保持现有导出
│   ├── google-search-service.ts          # 现有 Google 搜索
│   ├── reddit-service.ts                 # 现有 Reddit
│   ├── amazon-search-service.ts          # 现有 Amazon
│   ├── social-mention-service.ts
│   ├── crawler-data-processor.ts
│   └── ai/                               # 【现有，完全不动】AI 分析器
│       ├── index.ts                      # 与爬虫实现解耦，无需修改
│       ├── ai-analyzer.interface.ts
│       ├── base-analyzer.ts
│       ├── factory.ts
│       ├── kimi-analyzer.ts
│       ├── bailian-analyzer.ts
│       └── zhipu-analyzer.ts
│
├── crawlers/                             # 【现有，不动】基础爬虫类
│   └── BaseCrawler.ts
│
├── types/                                # 【现有，逐步迁移到 domain/types/】
│   ├── index.ts
│   └── crawler.types.ts
│
├── utils/                                # 【现有，逐步迁移到 infrastructure/utils/】
│   ├── bitmap.ts
│   └── date.ts
│
├── adapters/                             # 【新增】适配器层
│   └── crawlee/                          # 只放 Crawlee 实现
│       ├── index.ts
│       ├── base/
│       │   └── base-crawler.ts           # Crawlee 基础类
│       ├── google/
│       │   ├── google-search.crawler.ts  # Google 搜索实现
│       │   └── types.ts
│       └── reddit/
│           ├── reddit.crawler.ts         # Reddit 实现
│           └── types.ts
│
├── factories/                            # 【新增】工厂层
│   ├── index.ts
│   ├── google-search.factory.ts          # Google 搜索工厂
│   └── reddit.factory.ts                 # Reddit 工厂
│
└── config/                               # 【新增】配置
    └── crawler.config.ts                 # 爬虫实现选择配置
```

---

## 三、详细设计

### AI分析服务处理方案

**AI分析服务与爬虫实现完全解耦**，无需任何修改：

```
┌─────────────────────────────────────────────────────────────┐
│                     AI 分析服务层                            │
│              (services/ai/ - 完全不变)                       │
│                                                             │
│   ┌─────────────────┐    ┌─────────────────────────────┐   │
│   │  AIAnalyzer     │◄───│  Legacy RedditCrawler       │   │
│   │  接口           │    │  (获取 RedditPost)          │   │
│   │                 │    │                             │   │
│   │  analyze(post)  │◄───│  Crawlee RedditCrawler      │   │
│   │                 │    │  (获取 RedditPost)          │   │
│   └─────────────────┘    └─────────────────────────────┘   │
│            │                                               │
│            ↓                                               │
│   ┌─────────────────┐                                      │
│   │  Kimi/Bailian   │                                      │
│   │  /Zhipu         │                                      │
│   │  具体实现        │                                      │
│   └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

**关键点：**

1. **AI分析器只依赖 `RedditPost` 数据结构**，不依赖爬虫实现
2. **Crawlee RedditCrawler 返回与 Legacy 相同的数据结构**
3. **现有的 `createAIAnalyzer()` 工厂函数可以继续使用**

**调度器中使用方式（不变）：**

```typescript
// 无论使用 Legacy 还是 Crawlee，AI 分析调用方式完全相同
import { createAIAnalyzer, createReddit } from "@good-trending/crawler";

// 创建爬虫（自动根据配置选择实现）
const reddit = createReddit();

// 获取帖子
const post = await reddit.fetchPost(url);

// AI 分析（与爬虫实现无关）
const aiAnalyzer = createAIAnalyzer();
const analysis = await aiAnalyzer.analyze(post);
```

**需要做的：**

- 确保 Crawlee RedditCrawler 返回的数据结构符合 `RedditPost` 接口
- 将 `RedditPost` 类型定义统一到 `domain/types/`，避免重复

---

### 3.1 领域层 (domain/)

#### 3.1.1 Google 搜索接口

**文件**: `apps/crawler/src/domain/interfaces/google-search.interface.ts`

```typescript
import type { SearchResult, SearchResponse } from "../../types/index.js";

/**
 * Google 搜索接口
 * 抽象 Google 搜索功能，与具体实现解耦
 */
export interface IGoogleSearch {
  /**
   * 执行搜索
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  search(query: string): Promise<SearchResponse>;

  /**
   * 关闭资源
   */
  close(): Promise<void>;
}

/**
 * Google 搜索接口标识符（用于依赖注入）
 */
export const GOOGLE_SEARCH_TOKEN = Symbol("IGoogleSearch");
```

#### 3.1.2 Reddit 接口

**文件**: `apps/crawler/src/domain/interfaces/reddit.interface.ts`

```typescript
import type { RedditPost } from "../types/index.js";

/**
 * Reddit 接口
 * 抽象 Reddit 内容提取功能
 */
export interface IReddit {
  /**
   * 获取帖子内容
   * @param url 帖子 URL
   * @returns 帖子数据
   */
  fetchPost(url: string): Promise<RedditPost | null>;

  /**
   * 提取 Amazon 链接
   * @param url 帖子 URL
   * @returns Amazon 链接列表
   */
  extractAmazonLinks?(url: string): Promise<string[]>;

  /**
   * 关闭资源
   */
  close(): Promise<void>;
}

/**
 * Reddit 接口标识符（用于依赖注入）
 */
export const REDDIT_TOKEN = Symbol("IReddit");
```

**与 AI 分析服务的兼容性说明：**

现有的 `services/ai/ai-analyzer.interface.ts` 已定义 `RedditPost` 类型：

```typescript
export interface RedditPost {
  title: string;
  content?: string;
  comments: string[];
}
```

新的 `domain/types/crawler.types.ts` 扩展此类型，添加更多字段：

```typescript
export interface RedditPost {
  title: string;
  content?: string;
  comments: string[];
  url: string; // 新增
  author?: string; // 新增
  postedAt?: string; // 新增
  upvotes?: number; // 新增
}
```

**兼容性：** ✅ 完全兼容

- Crawlee RedditCrawler 返回的数据包含所有必需字段
- AI 分析服务只读取 `title`, `content`, `comments`，忽略其他字段
- 两个 `RedditPost` 类型在 TypeScript 中是互相兼容的

#### 3.1.3 统一类型定义

**文件**: `apps/crawler/src/domain/types/crawler.types.ts`

```typescript
/**
 * 统一 Reddit 帖子类型
 * 兼容 AI 分析服务和爬虫实现
 */
export interface RedditPost {
  /** 帖子标题 */
  title: string;
  /** 帖子内容（可能为空） */
  content?: string;
  /** 评论列表 */
  comments: string[];
  /** 帖子 URL */
  url: string;
  /** 作者 */
  author?: string;
  /** 发布时间 */
  postedAt?: string;
  /** 点赞数 */
  upvotes?: number;
}

/**
 * AI 分析结果
 */
export interface AIAnalysisResult {
  /** 提取的商品关键词列表 */
  keywords: string[];
  /** 分析的原始内容摘要（用于调试） */
  summary?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  success: boolean;
  totalResults: number;
  links: SearchResult[];
  source: "serpapi" | "browser";
  error?: string;
}
```

#### 3.1.4 统一导出

**文件**: `apps/crawler/src/domain/interfaces/index.ts`

```typescript
export { IGoogleSearch, GOOGLE_SEARCH_TOKEN } from "./google-search.interface.js";
export { IReddit, REDDIT_TOKEN } from "./reddit.interface.js";

// 重新导出类型，方便使用
export type {
  RedditPost,
  AIAnalysisResult,
  SearchResult,
  SearchResponse,
} from "../types/crawler.types.js";
```

**文件**: `apps/crawler/src/domain/types/index.ts`

```typescript
export type {
  RedditPost,
  AIAnalysisResult,
  SearchResult,
  SearchResponse,
} from "./crawler.types.js";
```

#### 3.1.3 统一导出

**文件**: `apps/crawler/src/domain/interfaces/index.ts`

```typescript
export { IGoogleSearch, GOOGLE_SEARCH_TOKEN } from "./google-search.interface.js";
export { IReddit, REDDIT_TOKEN } from "./reddit.interface.js";
```

---

### 3.2 基础设施层 (infrastructure/)

#### 3.2.1 反检测脚本

**文件**: `apps/crawler/src/infrastructure/browser/stealth-scripts.ts`

```typescript
/**
 * 反检测脚本 - 从现有服务提取
 * 用于隐藏 Playwright 自动化特征
 */

export const STEALTH_SCRIPTS = {
  // 覆盖 navigator.webdriver
  webdriver: () => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  },

  // 覆盖 permissions API
  permissions: () => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = async (parameters: any) => {
      if (parameters.name === "notifications") {
        return { state: "default" } as PermissionStatus;
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };
  },

  // 覆盖 plugins
  plugins: () => {
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  },

  // 覆盖 languages
  languages: () => {
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  },
};

/**
 * 获取预构建的注入脚本字符串（用于 Playwright）
 */
export const getStealthScriptString = (): string => {
  return `
    ${STEALTH_SCRIPTS.webdriver.toString()};
    ${STEALTH_SCRIPTS.permissions.toString()};
    ${STEALTH_SCRIPTS.plugins.toString()};
    ${STEALTH_SCRIPTS.languages.toString()};

    webdriver();
    permissions();
    plugins();
    languages();
  `;
};

/**
 * 获取用于 addInitScript 的函数
 */
export const getStealthInitFunction = () => {
  return () => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = async (parameters: any) => {
      if (parameters.name === "notifications") {
        return { state: "default" } as PermissionStatus;
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };

    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  };
};
```

#### 3.2.2 User-Agent 列表

**文件**: `apps/crawler/src/infrastructure/browser/user-agents.ts`

```typescript
/**
 * 常见 User-Agent 列表
 */

export const DESKTOP_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.7 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.0.7",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
];

/**
 * 获取随机 User-Agent
 */
export const getRandomUserAgent = (): string => {
  return DESKTOP_USER_AGENTS[Math.floor(Math.random() * DESKTOP_USER_AGENTS.length)];
};
```

#### 3.2.3 延迟工具

**文件**: `apps/crawler/src/infrastructure/utils/delay.ts`

```typescript
/**
 * 延迟和随机化工具
 */

// 随机延迟范围配置
export const DELAY_RANGES = {
  SHORT: { min: 1000, max: 3000 }, // 1-3 秒
  MEDIUM: { min: 2000, max: 5000 }, // 2-5 秒
  LONG: { min: 3000, max: 8000 }, // 3-8 秒
  HUMAN: { min: 500, max: 1500 }, // 人类操作间隔
};

/**
 * 随机延迟
 */
export const randomDelay = async (
  min: number = DELAY_RANGES.MEDIUM.min,
  max: number = DELAY_RANGES.MEDIUM.max
): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * 带随机化的请求间隔
 */
export const requestDelay = async (baseDelay: number): Promise<void> => {
  const jitter = Math.random() * 1000 - 500; // ±500ms 抖动
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
};
```

#### 3.2.4 统一导出

**文件**: `apps/crawler/src/infrastructure/index.ts`

```typescript
// Browser
export {
  STEALTH_SCRIPTS,
  getStealthScriptString,
  getStealthInitFunction,
} from "./browser/stealth-scripts.js";

export { DESKTOP_USER_AGENTS, getRandomUserAgent } from "./browser/user-agents.js";

// Utils
export { DELAY_RANGES, randomDelay, requestDelay } from "./utils/delay.js";
```

---

### 3.3 适配器层 - Crawlee (adapters/crawlee/)

#### 3.3.1 Crawlee 基础类

**文件**: `apps/crawler/src/adapters/crawlee/base/base-crawler.ts`

```typescript
import { PlaywrightCrawler, Dataset } from "crawlee";
import { createLoggerInstance } from "@good-trending/shared";
import { getStealthInitFunction } from "../../../infrastructure/index.js";

const logger = createLoggerInstance("base-crawlee-crawler");

export interface BaseCrawleeConfig {
  /** 爬虫名称 */
  name: string;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 最大重试次数 */
  maxRequestRetries?: number;
  /** 请求超时（秒） */
  requestHandlerTimeoutSecs?: number;
  /** 每个爬虫最大请求数 */
  maxRequestsPerCrawl?: number;
  /** 是否无头模式 */
  headless?: boolean;
}

export abstract class BaseCrawleeCrawler<T = unknown> {
  protected crawler: PlaywrightCrawler;
  protected dataset: Dataset;
  protected config: BaseCrawleeConfig;
  protected logger = logger;

  constructor(config: BaseCrawleeConfig) {
    this.config = {
      maxConcurrency: 3,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 100,
      headless: true,
      ...config,
    };

    this.dataset = new Dataset(`${config.name}-results`);
    this.crawler = this.createCrawler();
  }

  private createCrawler(): PlaywrightCrawler {
    return new PlaywrightCrawler({
      name: this.config.name,
      maxConcurrency: this.config.maxConcurrency,
      maxRequestRetries: this.config.maxRequestRetries,
      requestHandlerTimeoutSecs: this.config.requestHandlerTimeoutSecs,
      maxRequestsPerCrawl: this.config.maxRequestsPerCrawl,

      launchContext: {
        launchOptions: {
          headless: this.config.headless,
          args: [
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
          ],
        },
      },

      preNavigationHooks: [
        async ({ page }) => {
          await page.addInitScript(getStealthInitFunction());
        },
      ],

      requestHandler: async (context) => {
        await this.handleRequest(context);
      },

      failedRequestHandler: async ({ request }) => {
        this.logger.error(`请求失败: ${request.url}`, {
          retryCount: request.retryCount,
          error: request.errorMessages,
        });
      },
    });
  }

  protected abstract handleRequest(context: any): Promise<void>;

  async addRequests(urls: Array<{ url: string; label?: string }>): Promise<void> {
    await this.crawler.addRequests(
      urls.map((item) => ({
        url: item.url,
        label: item.label || item.url,
      }))
    );
  }

  async run(): Promise<void> {
    await this.crawler.run();
  }

  async getData(): Promise<{ items: T[] }> {
    return this.dataset.getData() as Promise<{ items: T[] }>;
  }

  async clearData(): Promise<void> {
    await this.dataset.drop();
  }

  async close(): Promise<void> {
    this.logger.info(`${this.config.name} 爬虫已关闭`);
  }
}
```

#### 3.3.2 Google 搜索 Crawler

**文件**: `apps/crawler/src/adapters/crawlee/google/types.ts`

```typescript
import type { SearchResult } from "../../../types/index.js";

export interface GoogleSearchResult extends SearchResult {
  position: number;
}
```

**文件**: `apps/crawler/src/adapters/crawlee/google/google-search.crawler.ts`

```typescript
import { BaseCrawleeCrawler } from "../base/base-crawler.js";
import type { GoogleSearchResult } from "./types.js";
import type { IGoogleSearch } from "../../../domain/interfaces/index.js";
import type { SearchResponse } from "../../../types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("google-search-crawler");

/**
 * Crawlee Google 搜索爬虫
 * 实现 IGoogleSearch 接口
 */
export class GoogleSearchCrawler
  extends BaseCrawleeCrawler<GoogleSearchResult>
  implements IGoogleSearch
{
  constructor() {
    super({
      name: "google-search-crawler",
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 60,
      maxRequestsPerCrawl: 50,
    });
  }

  protected async handleRequest({ request, page, pushData }): Promise<void> {
    logger.info(`搜索: ${request.label || request.url}`);

    try {
      await page.waitForSelector("#search, #rso, #main", { timeout: 15000 });
      await page.waitForTimeout(2000 + Math.random() * 3000);

      const results = await page.evaluate(() => {
        const links: Array<{ title: string; url: string; snippet: string }> = [];

        const selectors = [
          'div[data-ved] a[jsname="UWckNb"]',
          'div.g a[href^="http"]',
          "div.yuRUbf > a",
          'div[data-sokoban-container] a[href^="http"]',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);

          for (const el of elements) {
            const url = el.getAttribute("href");
            const titleEl =
              el.querySelector("h3") ||
              el.closest("div[data-ved], div.g, div[data-sokoban-container]")?.querySelector("h3");
            const title = titleEl?.textContent || "";

            let snippet = "";
            const container = el.closest("div[data-ved], div.g, div[data-sokoban-container]");
            if (container) {
              const snippetEl = container.querySelector(
                'div[data-sncf="1"], div.VwiC3b, span.aCOpRe'
              );
              snippet = snippetEl?.textContent || "";
            }

            if (url && title && !url.includes("google.com")) {
              links.push({
                title: title.trim(),
                url: url,
                snippet: snippet.trim(),
              });
            }
          }

          if (links.length > 0) break;
        }

        return links;
      });

      logger.info(`提取到 ${results.length} 条搜索结果`);

      const searchResults: GoogleSearchResult[] = results.slice(0, 10).map((r, index) => ({
        ...r,
        position: index + 1,
      }));

      for (const result of searchResults) {
        await pushData(result);
      }

      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000 + Math.random() * 1000);
    } catch (error) {
      logger.error(`搜索失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  /**
   * 执行搜索（实现 IGoogleSearch 接口）
   */
  async search(query: string): Promise<SearchResponse> {
    await this.clearData();

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await this.addRequests([{ url: searchUrl, label: query }]);
    await this.run();

    const data = await this.getData();
    const results = data.items.slice(0, 10);

    return {
      success: results.length > 0,
      totalResults: results.length,
      links: results,
      source: "browser",
    };
  }
}

/**
 * 工厂函数
 */
export function createGoogleSearchCrawler(): GoogleSearchCrawler {
  return new GoogleSearchCrawler();
}
```

#### 3.3.3 Reddit Crawler

**文件**: `apps/crawler/src/adapters/crawlee/reddit/types.ts`

```typescript
import type { RedditPost } from "../../../domain/types/index.js";

/**
 * Reddit 爬取选项
 */
export interface RedditCrawlOptions {
  url: string;
  maxComments?: number;
  expandComments?: boolean;
}

/**
 * 内部数据格式（包含 Crawlee 元数据）
 */
export interface RedditPostData extends RedditPost {
  crawledAt?: string;
}
```

**文件**: `apps/crawler/src/adapters/crawlee/reddit/reddit.crawler.ts`

```typescript
import { BaseCrawleeCrawler } from "../base/base-crawler.js";
import type { RedditPostData } from "./types.js";
import type { IReddit } from "../../../domain/interfaces/index.js";
import type { RedditPost } from "../../../types/index.js";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("reddit-crawler");

/**
 * Crawlee Reddit 爬虫
 * 实现 IReddit 接口
 *
 * 返回的 RedditPost 格式与 AI 分析服务兼容
 * 可直接传递给 AIAnalyzer.analyze(post)
 */
export class RedditCrawler extends BaseCrawleeCrawler<RedditPostData> implements IReddit {
  private maxComments: number = 10;
  private expandComments: boolean = true;

  constructor() {
    super({
      name: "reddit-crawler",
      maxConcurrency: 2,
      maxRequestRetries: 3,
      requestHandlerTimeoutSecs: 90,
      maxRequestsPerCrawl: 30,
    });
  }

  protected async handleRequest({ request, page, pushData }): Promise<void> {
    logger.info(`爬取 Reddit: ${request.url}`);

    try {
      await page.waitForSelector('h1, [data-testid="post-container"], shreddit-post', {
        timeout: 15000,
      });

      await page.waitForTimeout(1500 + Math.random() * 2000);

      if (this.expandComments) {
        await this.expandCommentsOnPage(page);
      }

      // 提取帖子数据 - 确保与 AI 分析服务兼容的格式
      const postData = await page.evaluate((maxComments) => {
        // 标题
        const title =
          document.querySelector("h1")?.textContent?.trim() ||
          document.querySelector("h2")?.textContent?.trim() ||
          "";

        // 内容
        const content =
          document.querySelector('[data-testid="post-content"]')?.textContent?.trim() ||
          document.querySelector('div[data-click-id="text"]')?.textContent?.trim() ||
          "";

        // 作者
        const author =
          document.querySelector('[data-testid="post-author-link"]')?.textContent?.trim() ||
          document.querySelector('a[href^="/user/"]')?.textContent?.trim() ||
          "";

        // 点赞数
        const upvotesText =
          document.querySelector('[data-testid="upvote-button"]')?.textContent ||
          document.querySelector("faceplate-number")?.getAttribute("number") ||
          "0";
        const upvotes = parseInt(upvotesText.replace(/[^\d]/g, "")) || 0;

        // 发布时间
        const timeElement = document.querySelector("time");
        const postedAt = timeElement?.getAttribute("datetime") || "";

        // 评论列表 - 只提取文本内容
        const comments: string[] = [];
        const commentSelectors = [
          '[data-testid="comment"]',
          "shreddit-comment",
          'div[data-testid="comment"] > div',
        ];

        for (const selector of commentSelectors) {
          const commentElements = document.querySelectorAll(selector);
          commentElements.forEach((el) => {
            // 提取纯文本，过滤脚本和样式
            const text = el.textContent?.trim();
            if (text && comments.length < maxComments && text.length > 10) {
              comments.push(text);
            }
          });

          if (comments.length >= maxComments) break;
        }

        return {
          title,
          content,
          author,
          upvotes,
          postedAt,
          comments: comments.slice(0, maxComments),
        };
      }, this.maxComments);

      // 推送数据，包含 URL 和 Crawlee 元数据
      await pushData({
        ...postData,
        url: request.url,
        crawledAt: new Date().toISOString(),
      });

      logger.info(`成功提取帖子: ${postData.title.substring(0, 50)}...`, {
        commentsCount: postData.comments.length,
      });
    } catch (error) {
      logger.error(`爬取失败: ${request.url}`, { error: String(error) });
      throw error;
    }
  }

  private async expandCommentsOnPage(page: any): Promise<void> {
    try {
      const moreButtons = await page
        .locator('button:has-text("more replies"), button:has-text("View more comments")')
        .all();
      for (const button of moreButtons.slice(0, 3)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      const readMoreButtons = await page.locator('button:has-text("Read more")').all();
      for (const button of readMoreButtons.slice(0, 5)) {
        await button.click().catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch (error) {
      logger.warn("展开评论失败:", error);
    }
  }

  /**
   * 获取帖子（实现 IReddit 接口）
   *
   * 返回的 RedditPost 格式：
   * {
   *   title: string;
   *   content?: string;
   *   comments: string[];
   *   url: string;
   *   author?: string;
   *   postedAt?: string;
   *   upvotes?: number;
   * }
   *
   * 此格式与 AIAnalyzer.analyze(post: RedditPost) 完全兼容
   */
  async fetchPost(url: string): Promise<RedditPost | null> {
    this.maxComments = 10;
    await this.clearData();
    await this.addRequests([{ url, label: "single-post" }]);
    await this.run();

    const data = await this.getData();
    const post = data.items[0];

    if (!post) return null;

    // 返回符合 RedditPost 接口的数据（去掉 crawledAt 元数据）
    return {
      title: post.title,
      content: post.content,
      comments: post.comments,
      url: post.url,
      author: post.author,
      postedAt: post.postedAt,
      upvotes: post.upvotes,
    };
  }

  /**
   * 批量获取帖子
   */
  async fetchPosts(urls: string[], maxComments: number = 10): Promise<RedditPost[]> {
    this.maxComments = maxComments;
    await this.clearData();

    await this.addRequests(urls.map((url) => ({ url, label: "batch-post" })));

    await this.run();

    const data = await this.getData();
    return data.items.map((post) => ({
      title: post.title,
      content: post.content,
      comments: post.comments,
      url: post.url,
      author: post.author,
      postedAt: post.postedAt,
      upvotes: post.upvotes,
    }));
  }
}

/**
 * 工厂函数
 */
export function createRedditCrawler(): RedditCrawler {
  return new RedditCrawler();
}
```

#### 3.3.4 统一导出

**文件**: `apps/crawler/src/adapters/crawlee/index.ts`

```typescript
// Base
export { BaseCrawleeCrawler, type BaseCrawleeConfig } from "./base/base-crawler.js";

// Google
export {
  GoogleSearchCrawler,
  createGoogleSearchCrawler,
  type GoogleSearchResult,
} from "./google/google-search.crawler.js";

// Reddit
export {
  RedditCrawler,
  createRedditCrawler,
  type RedditPostData,
  type RedditCrawlOptions,
} from "./reddit/reddit.crawler.js";
```

---

### 3.4 配置层 (config/)

**文件**: `apps/crawler/src/config/crawler.config.ts`

```typescript
/**
 * 爬虫实现配置
 * 支持在 Legacy 和 Crawlee 实现间切换
 */

/**
 * 爬虫实现类型
 */
export type CrawlerImplementation = "legacy" | "crawlee";

/**
 * 获取当前配置的爬虫实现
 */
export function getCrawlerImplementation(): CrawlerImplementation {
  return (process.env.CRAWLER_IMPLEMENTATION as CrawlerImplementation) || "legacy";
}

/**
 * 是否使用 Crawlee 实现
 */
export function isCrawleeEnabled(): boolean {
  return getCrawlerImplementation() === "crawlee";
}

/**
 * 爬虫配置选项
 */
export interface CrawlerModuleConfig {
  /** Google 搜索实现 */
  googleSearch: CrawlerImplementation;
  /** Reddit 实现 */
  reddit: CrawlerImplementation;
  /** Amazon 搜索实现 */
  amazonSearch: CrawlerImplementation;
}

/**
 * 获取完整爬虫配置
 */
export function getCrawlerConfig(): CrawlerModuleConfig {
  return {
    googleSearch: (process.env.GOOGLE_SEARCH_IMPLEMENTATION as CrawlerImplementation) || "legacy",
    reddit: (process.env.REDDIT_IMPLEMENTATION as CrawlerImplementation) || "legacy",
    amazonSearch: (process.env.AMAZON_SEARCH_IMPLEMENTATION as CrawlerImplementation) || "legacy",
  };
}
```

---

### 3.5 工厂层 (factories/)

#### 3.5.1 Google 搜索工厂

**文件**: `apps/crawler/src/factories/google-search.factory.ts`

```typescript
import { GoogleSearchService } from "../services/google-search-service.js";
import { GoogleSearchCrawler } from "../adapters/crawlee/google/google-search.crawler.js";
import type { IGoogleSearch } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";

/**
 * Google 搜索实例类型
 */
export type GoogleSearchInstance = IGoogleSearch;

/**
 * 创建 Google 搜索实例
 * @param implementation 指定实现类型，不指定则使用配置
 * @returns Google 搜索实例
 */
export function createGoogleSearch(implementation?: CrawlerImplementation): GoogleSearchInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.googleSearch;

  if (impl === "crawlee") {
    return new GoogleSearchCrawler();
  } else {
    // Legacy: 包装现有服务以符合 IGoogleSearch 接口
    return new LegacyGoogleSearchAdapter();
  }
}

/**
 * Legacy Google 搜索适配器
 * 将现有 GoogleSearchService 包装为 IGoogleSearch 接口
 */
class LegacyGoogleSearchAdapter implements IGoogleSearch {
  private service: GoogleSearchService;

  constructor() {
    this.service = new GoogleSearchService({ forceBrowser: true });
  }

  async search(query: string) {
    return this.service.search(query);
  }

  async close() {
    await this.service.close();
  }
}
```

#### 3.5.2 Reddit 工厂

**文件**: `apps/crawler/src/factories/reddit.factory.ts`

```typescript
import { createRedditService, RedditService } from "../services/reddit-service.js";
import { createRedditCrawler, RedditCrawler } from "../adapters/crawlee/reddit/reddit.crawler.js";
import type { IReddit } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";
import type { Page } from "playwright";

/**
 * Reddit 实例类型
 */
export type RedditInstance = IReddit;

/**
 * 创建 Reddit 实例
 * @param implementation 指定实现类型，不指定则使用配置
 * @returns Reddit 实例
 */
export function createReddit(implementation?: CrawlerImplementation): RedditInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    // Legacy: 需要特殊处理，因为现有 RedditService 需要 page 参数
    return new LegacyRedditAdapter();
  }
}

/**
 * Legacy Reddit 适配器
 * 注意：Legacy 实现需要外部传入 page 对象，这里做特殊处理
 */
class LegacyRedditAdapter implements IReddit {
  private service: RedditService;

  constructor() {
    this.service = createRedditService();
  }

  async fetchPost(url: string) {
    // Legacy RedditService 需要 Page 对象
    // 这里简化处理，实际使用时可能需要创建浏览器实例
    throw new Error(
      "Legacy RedditService requires Playwright Page instance. Use RedditCrawler instead, or pass a page instance."
    );
  }

  async close() {
    // Legacy 无 close 方法
  }
}

/**
 * 创建 Reddit 实例（带 Page 参数的 Legacy 版本）
 * 用于兼容需要 Page 的场景
 */
export function createRedditWithPage(page: Page, implementation?: CrawlerImplementation): IReddit {
  const config = getCrawlerConfig();
  const impl = implementation || config.reddit;

  if (impl === "crawlee") {
    return new RedditCrawler();
  } else {
    return new LegacyRedditWithPageAdapter(page);
  }
}

/**
 * 带 Page 的 Legacy Reddit 适配器
 */
class LegacyRedditWithPageAdapter implements IReddit {
  private service: RedditService;
  private page: Page;

  constructor(page: Page) {
    this.service = createRedditService();
    this.page = page;
  }

  async fetchPost(url: string) {
    return this.service.fetchPost(this.page, url);
  }

  async close() {
    // Legacy 无 close 方法
  }
}
```

#### 3.5.3 统一导出

**文件**: `apps/crawler/src/factories/index.ts`

```typescript
export { createGoogleSearch, type GoogleSearchInstance } from "./google-search.factory.js";
export { createReddit, createRedditWithPage, type RedditInstance } from "./reddit.factory.js";
```

---

### 3.6 根入口更新

**文件**: `apps/crawler/src/index.ts`

```typescript
/**
 * ============================================
 * 现有导出（保持不变，向后兼容）
 * ============================================
 */

// AI Analysis Service
export {
  createAIAnalyzer,
  AIAnalyzerFactory,
  type AIAnalyzer,
  type AIAnalysisResult,
  type AIConfig,
  type AIProvider,
} from "./services/ai/index.js";

// Amazon Search Service
export {
  AmazonSearchService,
  createAmazonSearchService,
  type AmazonProduct,
  type AmazonSearchConfig,
} from "./services/amazon-search-service.js";

// Reddit Service (Legacy)
export {
  RedditService,
  createRedditService,
  type RedditServiceConfig,
} from "./services/reddit-service.js";

// Social Mention Service
export {
  SocialMentionService,
  createSocialMentionService,
  type ProductMentionStats,
  type PlatformMentions,
} from "./services/social-mention-service.js";

// Google Search Service (Legacy)
export {
  GoogleSearchService,
  type SearchResult,
  type SearchResponse,
} from "./services/google-search-service.js";

// Data Processor Functions
export {
  saveCategoryHeatStats,
  saveCrawledProducts,
  saveProductSocialStats,
  updateAllProductsBitmap,
  saveCrawlerLog,
} from "./services/crawler-data-processor.js";

// Type Exports
export type {
  CategoryData,
  CrawledProduct,
  CrawlerLogData,
  CategoryHeatResult,
  ProductMentionStat,
} from "./types/crawler.types.js";

// Base Crawler Class
export { BaseCrawler, CrawlerStatus } from "./crawlers/BaseCrawler.js";

// Utility Functions
export { formatDate } from "./utils/date.js";

/**
 * ============================================
 * 【新增】领域层导出
 * ============================================
 */

export {
  IGoogleSearch,
  GOOGLE_SEARCH_TOKEN,
  IReddit,
  REDDIT_TOKEN,
  // 类型重新导出
  type RedditPost,
  type AIAnalysisResult,
  type SearchResult,
  type SearchResponse,
} from "./domain/interfaces/index.js";

/**
 * ============================================
 * AI 分析服务导出（保持不变，向后兼容）
 * ============================================
 */

export // 注意：AI 分析服务位于 services/ai/，完全不变
// 以下导出已在上面存在，此处仅作说明
// createAIAnalyzer,
// AIAnalyzerFactory,
// type AIAnalyzer,
// type AIAnalysisResult,
 {};

/**
 * ============================================
 * 【新增】基础设施层导出
 * ============================================
 */

export {
  // Browser
  STEALTH_SCRIPTS,
  getStealthScriptString,
  getStealthInitFunction,
  DESKTOP_USER_AGENTS,
  getRandomUserAgent,
  // Utils
  DELAY_RANGES,
  randomDelay,
  requestDelay,
} from "./infrastructure/index.js";

/**
 * ============================================
 * 【新增】Crawlee 适配器导出
 * ============================================
 */

export {
  // Base
  BaseCrawleeCrawler,
  type BaseCrawleeConfig,
} from "./adapters/crawlee/base/base-crawler.js";

export {
  // Google
  GoogleSearchCrawler,
  createGoogleSearchCrawler,
  type GoogleSearchResult,
} from "./adapters/crawlee/google/google-search.crawler.js";

export {
  // Reddit
  RedditCrawler,
  createRedditCrawler,
  type RedditPostData,
  type RedditCrawlOptions,
} from "./adapters/crawlee/reddit/reddit.crawler.js";

/**
 * ============================================
 * 【新增】工厂层导出
 * ============================================
 */

export {
  createGoogleSearch,
  type GoogleSearchInstance,
  createReddit,
  createRedditWithPage,
  type RedditInstance,
} from "./factories/index.js";

/**
 * ============================================
 * 【新增】配置导出
 * ============================================
 */

export {
  getCrawlerImplementation,
  isCrawleeEnabled,
  getCrawlerConfig,
  type CrawlerImplementation,
  type CrawlerModuleConfig,
} from "./config/crawler.config.js";
```

---

## 四、调度器集成

### 4.1 环境变量配置

**在 `apps/scheduler/.env` 中添加：**

```bash
# 爬虫实现配置
# 可选值: legacy | crawlee
CRAWLER_IMPLEMENTATION=legacy

# 各模块单独配置（覆盖全局配置）
GOOGLE_SEARCH_IMPLEMENTATION=legacy
REDDIT_IMPLEMENTATION=legacy
AMAZON_SEARCH_IMPLEMENTATION=legacy
```

### 4.2 调度器使用示例

#### 基础用法（仅爬虫）

**修改前（现有代码）：**

```typescript
import { GoogleSearchService } from "@good-trending/crawler";

// 直接使用现有服务
const googleSearch = new GoogleSearchService({ forceBrowser: true });
const results = await googleSearch.search(query);
```

**修改后（使用工厂）：**

```typescript
import { createGoogleSearch, createReddit } from "@good-trending/crawler";

// 使用工厂创建实例（自动根据配置选择实现）
const googleSearch = createGoogleSearch();
const results = await googleSearch.search(query);

// 或明确指定实现
const googleSearchCrawlee = createGoogleSearch("crawlee");
const redditCrawlee = createReddit("crawlee");
```

#### 完整用法（爬虫 + AI 分析）

**修改前（现有代码）：**

```typescript
import { GoogleSearchService, createRedditService, createAIAnalyzer } from "@good-trending/crawler";

// 创建服务
const googleSearch = new GoogleSearchService({ forceBrowser: true });
const redditService = createRedditService();
const aiAnalyzer = createAIAnalyzer();

// 搜索 Reddit 帖子
const results = await googleSearch.search("site:reddit.com headphones");

// 获取帖子内容
for (const result of results.links) {
  // Legacy Reddit 需要外部 page 对象
  const post = await redditService.fetchPost(page, result.url);

  // AI 分析
  const analysis = await aiAnalyzer.analyze(post);
  console.log(analysis.keywords);
}
```

**修改后（使用 Crawlee）：**

```typescript
import { createGoogleSearch, createReddit, createAIAnalyzer } from "@good-trending/crawler";

// 创建服务（自动根据配置选择 Crawlee 或 Legacy）
const googleSearch = createGoogleSearch(); // 或 createGoogleSearch('crawlee')
const reddit = createReddit(); // 或 createReddit('crawlee')
const aiAnalyzer = createAIAnalyzer();

// 搜索 Reddit 帖子
const results = await googleSearch.search("site:reddit.com headphones");

// 获取帖子内容
for (const result of results.links) {
  // Crawlee Reddit 不需要外部 page 对象
  const post = await reddit.fetchPost(result.url);

  if (post) {
    // AI 分析 - 与 Legacy 完全相同！
    const analysis = await aiAnalyzer.analyze(post);
    console.log("提取的关键词:", analysis.keywords);
    console.log("分析摘要:", analysis.summary);
  }
}

// 关闭资源
await googleSearch.close();
await reddit.close();
```

**关键优势：**

- ✅ AI 分析调用方式**完全相同**
- ✅ `post` 数据结构**完全兼容**
- ✅ Crawlee 实现**不需要外部 page 对象**
- ✅ 代码更简洁，资源管理更方便

---

## 五、实施计划

### 阶段 1: 基础设施层（预计 1-2 小时）

- [ ] 创建 `infrastructure/browser/` - 反检测脚本、UA 列表
- [ ] 创建 `infrastructure/utils/` - 延迟工具
- [ ] 从现有代码提取公共逻辑到 infrastructure

### 阶段 2: 领域层（预计 30 分钟）

- [ ] 创建 `domain/interfaces/` - 定义 IGoogleSearch、IReddit 接口

### 阶段 3: Crawlee 适配器（预计 2-3 小时）

- [ ] 创建 `adapters/crawlee/base/base-crawler.ts`
- [ ] 实现 `adapters/crawlee/google/google-search.crawler.ts`
- [ ] 实现 `adapters/crawlee/reddit/reddit.crawler.ts`
- [ ] 更新 `adapters/crawlee/index.ts` 导出

### 阶段 4: AI 服务集成确认（预计 15 分钟）

- [ ] 确认 `services/ai/` 目录无需修改
- [ ] 验证 Crawlee RedditCrawler 返回的 `RedditPost` 与 AI 服务兼容
- [ ] 更新 `domain/types/crawler.types.ts` 统一类型定义

### 阶段 5: 配置与工厂（预计 1 小时）

- [ ] 创建 `config/crawler.config.ts`
- [ ] 实现 `factories/google-search.factory.ts`
- [ ] 实现 `factories/reddit.factory.ts`
- [ ] 更新 `factories/index.ts` 导出

### 阶段 6: 根入口更新（预计 30 分钟）

- [ ] 更新 `index.ts` 添加所有新导出

### 阶段 7: 调度器集成（预计 1 小时）

- [ ] 更新 `.env` 配置
- [ ] 修改调度器爬虫文件使用工厂
- [ ] 测试 Legacy/Crawlee 切换

### 阶段 8: AI 分析集成测试（预计 30 分钟）

- [ ] 测试 Crawlee Reddit + AI 分析完整流程
- [ ] 验证关键词提取功能正常
- [ ] 对比 Legacy 和 Crawlee 的 AI 分析结果

---

## 六、依赖安装

```bash
# 在 apps/crawler 目录下
pnpm add crawlee

# 如果 scheduler 需要独立运行 Crawlee 测试
pnpm add -D crawlee --filter @good-trending/scheduler
```

---

## 七、验证清单

实施完成后，请验证以下项目：

### 基础功能

- [ ] 现有代码零修改，`services/` 目录完全不变
- [ ] Legacy 实现可以正常工作
- [ ] Crawlee 实现可以正常工作
- [ ] 通过配置可以切换实现
- [ ] 调度器任务可以正常执行
- [ ] 所有类型导出正确
- [ ] 反检测脚本正常工作

### AI 分析集成

- [ ] `services/ai/` 目录无需任何修改
- [ ] Crawlee RedditCrawler 返回的 `RedditPost` 与 AI 服务兼容
- [ ] AI 分析可以正常分析 Crawlee 获取的帖子
- [ ] 关键词提取功能正常
- [ ] AI 分析结果与 Legacy 爬虫获取的结果质量相当

---

## 八、风险与回滚

### 风险评估

| 风险                   | 可能性 | 影响 | 缓解措施             |
| ---------------------- | ------ | ---- | -------------------- |
| Crawlee 与现有代码冲突 | 低     | 中   | 完全隔离的目录结构   |
| 反检测效果不佳         | 中     | 高   | 保留 Legacy 作为后备 |
| 性能问题               | 低     | 中   | 配置化切换，快速回滚 |

### 回滚方案

1. **配置切换**：设置 `CRAWLER_IMPLEMENTATION=legacy` 立即回滚
2. **代码回滚**：删除 `adapters/crawlee/`、`factories/`、`config/`、`domain/`、`infrastructure/` 目录
3. **调度器回滚**：恢复原始导入语句

---

## 九、AI 服务处理总结

### 核心结论

**AI 分析服务 (`services/ai/`) 无需任何修改。**

### 原因

1. **接口隔离**: AI 分析只依赖 `RedditPost` 数据结构，与爬虫实现无关
2. **类型兼容**: Crawlee RedditCrawler 返回的 `RedditPost` 与现有 AI 服务兼容
3. **调用方式**: `aiAnalyzer.analyze(post)` 调用方式完全相同

### 使用示例

```typescript
import { createReddit, createAIAnalyzer } from "@good-trending/crawler";

// 无论使用 Legacy 还是 Crawlee，AI 分析调用完全一致
const reddit = createReddit("crawlee"); // 或 'legacy'
const aiAnalyzer = createAIAnalyzer();

// 获取帖子
const post = await reddit.fetchPost(url);

// AI 分析（与爬虫实现无关）
const analysis = await aiAnalyzer.analyze(post);
console.log(analysis.keywords); // 提取的产品关键词
```

---

## 十、后续优化方向

1. **代理轮换**：集成 Crawlee 的 `ProxyConfiguration`
2. **分布式爬虫**：使用 Crawlee 的 `RequestQueue` 持久化
3. **数据导出**：利用 Crawlee 的 `Dataset` 导出功能
4. **监控统计**：使用 Crawlee 内置的统计 API
5. **完全迁移**：验证 Crawlee 稳定后，可逐步将 Legacy 代码标记为 deprecated
6. **AI 分析增强**：考虑在 Crawlee 中集成 AI 分析作为请求处理器的一部分

---

## 方案总结

### 关键设计决策

| 项目         | 决策        | 说明                                      |
| ------------ | ----------- | ----------------------------------------- |
| **AI 服务**  | 完全不变    | `services/ai/` 目录零修改，与爬虫实现解耦 |
| **现有服务** | 完全不动    | `services/` 目录零修改，向后兼容          |
| **新实现**   | 适配器模式  | Crawlee 实现放在 `adapters/crawlee/`      |
| **类型定义** | 统一分层    | 共享类型放在 `domain/types/`              |
| **切换方式** | 工厂 + 配置 | 通过环境变量或参数切换实现                |

### AI 服务与爬虫的关系

```
┌─────────────────────────────────────────────────────────────┐
│                        调度器 (Scheduler)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │  createReddit() │───►│  reddit.fetchPost(url)      │    │
│  │  (Legacy/       │    │  返回 RedditPost            │    │
│  │   Crawlee)      │    └─────────────┬───────────────┘    │
│  └─────────────────┘                  │                    │
│                                       ▼                    │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │  createAI       │◄───│  aiAnalyzer.analyze(post)   │    │
│  │  Analyzer()     │    │  返回 AIAnalysisResult      │    │
│  └─────────────────┘    └─────────────────────────────┘    │
│                                                             │
│  关键点：                                                   │
│  • AI 分析器不依赖爬虫实现                                   │
│  • RedditPost 数据结构兼容                                  │
│  • 调用方式完全相同                                         │
└─────────────────────────────────────────────────────────────┘
```

**方案文档已生成完毕。请确认后，我将按阶段实施。**
