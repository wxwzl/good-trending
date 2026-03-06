# Twitter/X 爬虫使用指南

## 概述

完善后的 Twitter 爬虫使用 **Nitter**（Twitter 开源镜像站）来抓取公开推文数据，无需登录 Twitter 账号。

## 核心特性

1. **无需登录** - 使用 Nitter 镜像站，避免 Twitter 登录和验证码
2. **多实例轮换** - 自动切换可用的 Nitter 实例
3. **智能提取** - 提取推文内容、互动数据、商品链接
4. **关键词搜索** - 支持多个关键词搜索热门商品
5. **趋势计算** - 基于点赞、转发、评论计算趋势分数

## 配置选项

```typescript
const crawler = new TwitterCrawler(
  // 基础爬虫配置
  {
    headless: true, // 无头模式
    requestDelay: 3000, // 请求间隔（毫秒）
    maxRetries: 5, // 最大重试次数
  },
  // Twitter 特定配置
  {
    keywords: [
      // 搜索关键词
      "amazon finds",
      "#amazonfinds",
      "tiktok made me buy it",
    ],
    maxTweets: 100, // 最大抓取推文数
    minLikes: 10, // 最小点赞数过滤
    extractAmazonLinks: true, // 提取 Amazon 链接
    extractShoppingLinks: true, // 提取其他购物链接
    nitterInstances: [
      // Nitter 实例列表
      "https://nitter.net",
      "https://nitter.privacydev.net",
      "https://nitter.poast.org",
    ],
  }
);
```

## 默认搜索关键词

```typescript
[
  "amazon finds",
  "amazon must haves",
  "tiktok made me buy it",
  "#amazonfinds",
  "#tiktokmademebuyit",
  "link in bio shop",
  "buy this amazon",
];
```

## 使用方法

### 1. 运行爬虫

```bash
# 运行所有爬虫（包括 Twitter）
pnpm --filter @good-trending/crawler crawl:all

# 只运行 Twitter 爬虫
pnpm --filter @good-trending/crawler crawl:twitter

# 使用自定义参数
pnpm --filter @good-trending/crawler crawl:twitter --max-products 50
```

### 2. 程序化使用

```typescript
import { TwitterCrawler } from "@good-trending/crawler";

async function main() {
  const crawler = new TwitterCrawler(
    { headless: false }, // 显示浏览器窗口
    {
      keywords: ["iPhone 15", "AirPods"],
      maxTweets: 50,
      minLikes: 20,
    }
  );

  const result = await crawler.execute();

  console.log(`Found ${result.total} products`);
  console.log(`Duration: ${result.duration}ms`);

  for (const product of result.data) {
    console.log(`- ${product.name}`);
    console.log(`  Source: ${product.sourceUrl}`);
  }

  // 获取原始推文数据
  const tweets = crawler.getTweets();
  for (const tweet of tweets) {
    console.log(`Tweet by @${tweet.author.username}`);
    console.log(`Likes: ${tweet.stats.likes}, RTs: ${tweet.stats.retweets}`);
    console.log(`Trend Score: ${TwitterCrawler.calculateTrendScore(tweet)}`);
  }
}
```

## 数据结构

### 推文数据 (TweetData)

```typescript
{
  tweetId: "123456789",
  tweetUrl: "https://twitter.com/user/status/123456789",
  content: "Check out this amazing product!",
  createdAt: "2024-03-06T12:00:00.000Z",
  author: {
    username: "@influencer",
    displayName: "Product Guru",
    followersCount: 50000,
  },
  stats: {
    likes: 1250,
    retweets: 300,
    replies: 45,
  },
  productLinks: ["https://amazon.com/dp/B08N5WRWNW"],
  hashtags: ["#amazonfinds", "#ad"],
}
```

### 商品数据 (ProductData)

```typescript
{
  name: "Product from X: @influencer",
  description: "Check out this amazing product!",
  sourceUrl: "https://amazon.com/dp/B08N5WRWNW",
  sourceId: "B08N5WRWNW",
  sourceType: "X_PLATFORM",
}
```

## 趋势分数计算

```typescript
const score = TwitterCrawler.calculateTrendScore(tweet);

// 计算公式:
// score = (likes * 1 + retweets * 2 + replies * 1.5) * authorWeight * timeDecay
//
// 作者权重: log10(followers) / 10
// 时间衰减: 1 - daysSince / 7 (7天内)
```

## Nitter 实例列表

可用的 Nitter 实例（持续更新）：

- `https://nitter.net` (官方)
- `https://nitter.privacydev.net`
- `https://nitter.poast.org`
- `https://nitter.cz`
- `https://nitter.it`

> 注意：Nitter 实例可能不稳定，爬虫会自动切换可用实例。

## 注意事项

1. **稳定性** - Nitter 实例可能不可用，爬虫会自动重试和切换
2. **速率限制** - 已设置 3 秒默认延迟，避免被封
3. **数据完整性** - 某些推文可能缺少互动数据或链接
4. **合法性** - 遵守 Twitter ToS 和相关法规

## 备选方案

如果 Nitter 无法使用，可以考虑：

1. **Twitter API v2** - 官方 API（需要付费）
2. **RapidAPI** - 第三方 Twitter API
3. **ScraperAPI** - 专业的爬虫代理服务
4. **自建 Nitter** - 部署私有 Nitter 实例

## 故障排除

### 无法获取推文

- 检查 Nitter 实例是否可用：在浏览器中访问 `https://nitter.net/search?q=test`
- 尝试更换 Nitter 实例
- 增加 `requestDelay` 避免被封

### 提取数据为空

- Nitter 页面结构可能已更新，需要更新 CSS 选择器
- 检查目标关键词是否有足够推文

### 登录问题

- 本爬虫使用 Nitter，**不需要 Twitter 登录**
- 如果遇到人机验证，尝试切换实例或等待
