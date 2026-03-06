# Twitter/X 爬虫完善计划

## 现状分析

当前 Twitter 爬虫只有框架，返回 mock 数据。需要完善为可实际运行的爬虫。

## 挑战与限制

1. **登录要求** - Twitter/X 需要登录才能查看搜索结果
2. **反爬虫机制** - 有验证码、速率限制、设备指纹检测
3. **动态内容** - 页面使用大量 JavaScript 渲染
4. **结构变化** - 页面结构经常更新

## 实现方案

### 方案 A: 完整实现（推荐用于生产）

使用 Playwright + 真实账号登录，模拟人类行为：

1. **登录流程**
   - 输入用户名/密码
   - 处理邮箱验证（如有）
   - 处理手机验证（如有）
   - 保存登录态（cookies）

2. **搜索策略**
   - 搜索关键词："amazon finds", "#ad", "#sponsored", "buy this"
   - 使用高级搜索过滤（最近、有互动）
   - 滚动加载更多推文

3. **数据提取**
   - 推文内容
   - 互动数据：点赞、转发、评论、浏览量
   - 商品链接（Amazon、Ebay 等）
   - 推文作者信息

4. **反检测措施**
   - 随机延迟
   - 人类化滚动
   - 浏览器指纹伪装
   - 代理轮换

### 方案 B: 简化实现（推荐用于演示）

使用公开数据或替代方案：

1. **Nitter 镜像站** - 无需登录的 Twitter 镜像
2. **RSS 订阅** - 特定账号的 RSS 源
3. **搜索建议** - Twitter 搜索建议 API（有限）

## 数据模型

### 推文数据 (TweetData)

```typescript
interface TweetData {
  // 基础信息
  tweetId: string;
  tweetUrl: string;
  content: string;
  createdAt: string;

  // 作者信息
  author: {
    id: string;
    username: string;
    displayName: string;
    followersCount: number;
  };

  // 互动数据
  stats: {
    likes: number;
    retweets: number;
    replies: number;
    views: number;
    bookmarks: number;
  };

  // 商品相关
  productLinks: string[];
  mentionedProducts: string[];

  // 标签和话题
  hashtags: string[];
  mentions: string[];
}
```

### 趋势计算

从推文中计算商品热度：

- 总互动数 = 点赞 + 转发 + 评论
- 加权分数 = 互动数 × 作者粉丝数权重 × 时间衰减
- 提及次数 = 包含商品链接的推文数

## 配置选项

```typescript
interface TwitterCrawlerConfig {
  // 认证
  username?: string;
  password?: string;
  email?: string; // 用于验证

  // 搜索
  keywords: string[];
  searchFilters: {
    minLikes: number; // 最小点赞数
    minRetweets: number; // 最小转发数
    language: string; // 语言过滤
    dateRange: string; // 时间范围
  };

  // 限制
  maxTweets: number;
  maxScrolls: number;

  // 反检测
  useProxy: boolean;
  proxyList: string[];
  humanLikeDelay: boolean;
}
```

## 关键词策略

```typescript
const DEFAULT_KEYWORDS = [
  // 购物相关
  "amazon finds",
  "amazon must haves",
  "tiktok made me buy it",

  // 标签
  "#ad",
  "#sponsored",
  "#amazonfinds",
  "#tiktokmademebuyit",

  // 通用
  "buy this",
  "link in bio",
  "shop my",
];
```

## 实现步骤

1. 完善登录流程（处理验证）
2. 实现搜索和滚动加载
3. 实现推文数据提取
4. 实现商品链接识别
5. 添加趋势数据计算
6. 添加错误处理和重试
7. 添加反检测措施

## 注意事项

1. **合规性** - 遵守 Twitter ToS 和 robots.txt
2. **速率限制** - 控制请求频率，避免被封
3. **数据隐私** - 处理用户数据时遵守隐私法规
4. **备选方案** - 准备 Twitter API v2 作为备选
