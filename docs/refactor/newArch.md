重构方案：垂直切片架构

核心思想

按业务功能垂直切片，每个功能模块包含完整的调度+爬虫逻辑。

新架构

apps/
├── crawler/src/ # 只保留通用基础设施
│ ├── services/
│ │ ├── google-search-service.ts # Google搜索服务
│ │ ├── amazon-product-service.ts # 亚马逊商品服务
│ │ └── reddit-content-service.ts # Reddit内容服务
│ └── utils/ # 通用工具
│
├── scheduler/src/
│ └── jobs/ # 按任务组织
│ ├── category-heat/ # 类目热度任务（完整模块）
│ │ ├── index.ts # 导出
│ │ ├── scheduler.ts # 调度配置（何时执行）
│ │ ├── processor.ts # 任务处理器
│ │ ├── crawler.ts # 爬虫实现
│ │ ├── types.ts # 类型定义
│ │ └── repository.ts # 数据存储
│ │
│ ├── product-discovery/ # 商品发现任务
│ │ ├── scheduler.ts
│ │ ├── processor.ts
│ │ ├── crawler.ts
│ │ └── ...
│ │
│ ├── product-mentions/ # 提及统计任务
│ │ └── ...
│ │
│ └── yesterday-stats/ # 昨天数据任务
│ └── ...

┌─────────────────────────────────────────────────────────┐
│ 垂直业务层 (Jobs) │
├─────────────────────────────────────────────────────────┤
│ AIProductDiscoveryJob ← 完整的业务流程 │
│ ├── 1. 爬取 Reddit 帖子 │
│ ├── 2. 调用 AIAnalyzer 分析关键词 ← 使用公共服务 │
│ ├── 3. 调用 AmazonSearch 搜索商品 ← 使用公共服务 │
│ ├── 4. 保存商品 │
│ └── 5. 调用 GoogleSearch 统计提及 ← 使用公共服务 │
├─────────────────────────────────────────────────────────┤
│ 公共服务层 (Services) │
├─────────────────────────────────────────────────────────┤
│ AIAnalyzer → 文本分析，提取关键词 │
│ GoogleSearchService → Google 搜索 │
│ AmazonSearchService → 亚马逊商品搜索 │
│ RedditService → Reddit 内容爬取 │
└─────────────────────────────────────────────────────────┘

每个任务的内部结构

// scheduler/src/jobs/category-heat/index.ts
export { CATEGORY_HEAT_SCHEDULE } from './scheduler';
export { processCategoryHeatJob } from './processor';
export type { CategoryHeatResult } from './types';

// scheduler/src/jobs/category-heat/scheduler.ts
export const CATEGORY_HEAT_SCHEDULE = {
name: 'category-heat',
cron: '0 _/2 _ \* \*',
enabled: true,
};

// scheduler/src/jobs/category-heat/processor.ts
import { crawlCategoryHeat } from './crawler';

export async function processCategoryHeatJob(job: Job) {
// 1. 获取类目
const categories = await getCategories();

    // 2. 爬取（调用同模块的爬虫）
    const result = await crawlCategoryHeat(categories);

    // 3. 保存
    await saveResults(result);

}

// scheduler/src/jobs/category-heat/crawler.ts
// 爬虫逻辑放在调度模块内，不再分散在crawler包
export async function crawlCategoryHeat(categories: Category[]) {
// 直接使用通用服务
const searchService = new GoogleSearchService();

    for (const category of categories) {
      const result = await searchService.search(
        `site:reddit.com ${category.name} after:${date}`
      );
      // ...
    }

}

---

具体重构步骤

步骤1：提取通用服务到 crawler

将 GoogleSearchCrawler 拆分为通用服务：

// crawler/src/services/google-search-service.ts
export class GoogleSearchService {
async search(query: string): Promise<SearchResult>;
}

// crawler/src/services/amazon-extract-service.ts
export class AmazonExtractService {
async extractFromRedditPost(url: string): Promise<AmazonProduct[]>;
async extractProductInfo(url: string): Promise<ProductInfo>;
}

// crawler/src/services/reddit-service.ts
export class RedditService {
async expandContent(page: Page): Promise<void>;
async extractLinks(page: Page): Promise<string[]>;
}

步骤2：在 scheduler 创建垂直模块

每个任务一个文件夹，包含完整逻辑：

// scheduler/src/jobs/product-discovery/crawler.ts
import { GoogleSearchService } from '@good-trending/crawler';

// 爬虫实现移到调度模块
export class ProductDiscoveryCrawler {
private searchService = new GoogleSearchService();

    async crawl(categories: Category[]): Promise<Product[]> {
      // 原 GoogleSearchCrawler.crawlProductsByCategory 的逻辑移到这里
    }

}

步骤3：统一任务注册

// scheduler/src/jobs/index.ts
import { CATEGORY_HEAT_SCHEDULE, processCategoryHeatJob } from './category-heat';
import { PRODUCT_DISCOVERY_SCHEDULE, processProductDiscoveryJob } from './product-discovery';

export const REGISTERED_JOBS = [
{
...CATEGORY_HEAT_SCHEDULE,
processor: processCategoryHeatJob,
},
{
...PRODUCT_DISCOVERY_SCHEDULE,
processor: processProductDiscoveryJob,
},
// ...
];

步骤4：简化调度器

// scheduler/src/scheduler/index.ts
import { REGISTERED_JOBS } from '../jobs';

export function startScheduler() {
for (const job of REGISTERED_JOBS) {
scheduleJob(job.name, job.cron, () => {
return addJobToQueue(job.name, job.processor);
});
}
}

---

重构后的优势

┌──────────┬──────────────────────────────────┬──────────────────────────────────┐
│ 方面 │ 重构前 │ 重构后 │
├──────────┼──────────────────────────────────┼──────────────────────────────────┤
│ 文件定位 │ 需要在多个文件中跳转 │ 一个功能一个文件夹 │
├──────────┼──────────────────────────────────┼──────────────────────────────────┤
│ 职责边界 │ GoogleSearchCrawler 承担多个职责 │ 每个爬虫只负责一个业务 │
├──────────┼──────────────────────────────────┼──────────────────────────────────┤
│ 代码复用 │ 通过类继承 │ 通过服务组合 │
├──────────┼──────────────────────────────────┼──────────────────────────────────┤
│ 测试难度 │ 高（依赖整个Crawler类） │ 低（可单独测试每个模块） │
├──────────┼──────────────────────────────────┼──────────────────────────────────┤
│ 新人上手 │ 困难 │ 容易（看文件夹就知道有哪些任务） │
└──────────┴──────────────────────────────────┴──────────────────────────────────┘
