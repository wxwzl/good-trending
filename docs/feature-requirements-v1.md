# Good-Trending 功能需求文档 V1

> 本文档记录基于现有数据库结构需要实现的前端功能需求
> 创建日期: 2026-03-11
> 状态: 待确认

---

## 目录

1. [需求概述](#1-需求概述)
2. [功能清单](#2-功能清单)
3. [详细需求](#3-详细需求)
4. [技术方案](#4-技术方案)
5. [后端API改动](#5-后端api改动)
6. [实施计划](#6-实施计划)

---

## 1. 需求概述

基于现有的数据库表结构，有多个数据表的数据在Web端未被充分利用。本需求旨在将这些数据可视化展示，提升用户体验和平台数据价值。

### 涉及的数据库表

| 表名 | 当前使用情况 | 计划利用方式 |
|------|-------------|-------------|
| `productSocialStats` | ❌ 未使用 | 商品社交提及趋势图表 |
| `productAppearanceStats` | ❌ 未使用 | 商品出现活跃度热力图 |
| `categoryHeatStats` | ❌ 未使用 | 类目热度数据可视化 |
| `trendRanks` | ⚠️ 部分使用 | 趋势变化历史图表 |

---

## 2. 功能清单

### 功能1: 商品详情页增强
**优先级**: P0 (核心功能)
**涉及页面**: `/product/[slug]`

当前商品详情页仅展示基础信息，计划增加以下数据展示：

- [ ] 首次发现时间 (`products.firstSeenAt`)
- [ ] 所属分类标签 (`productCategories` + `categories`)
- [ ] 社交提及趋势图表 (近30天 Reddit/X 提及数)
- [ ] 出现活跃度热力图 (近60天出现记录)
- [ ] 历史排名趋势 (如该商品曾进入热门榜)

---

### 功能2: 商品社交提及趋势
**优先级**: P1 (高价值)
**涉及页面**: `/product/[slug]`

**数据来源**: `productSocialStats`

**展示内容**:
- 今日/昨日/本周/本月 Reddit 提及数对比
- 今日/昨日/本周/本月 X 平台提及数对比
- 近30天每日提及数折线图
- 总提及数统计

**数据字段**:
```typescript
- todayRedditCount / todayXCount
- yesterdayRedditCount / yesterdayXCount
- thisWeekRedditCount / thisWeekXCount
- thisMonthRedditCount / thisMonthXCount
- last7DaysRedditCount / last7DaysXCount
- last30DaysRedditCount / last30DaysXCount
```

---

### 功能3: 类目热度可视化
**优先级**: P1 (平台价值展示)
**涉及页面**: `/topics/[slug]`

**数据来源**: `categoryHeatStats`

**展示内容**:
- 类目今日 Reddit/X 搜索结果总数
- 较昨日增长/下降百分比
- 近7天搜索结果趋势图
- 今日爬取到的商品数量
- 类目热度排行榜（与其他类目对比）

**数据字段**:
```typescript
- redditResultCount / xResultCount
- yesterdayRedditCount / yesterdayXCount
- last7DaysRedditCount / last7DaysXCount
- crawledProductCount
```

**UI设计建议**:
```
┌─────────────────────────────────────────┐
│  Category Name                          │
│  Description...                         │
├─────────────────────────────────────────┤
│  📊 热度统计                [趋势图]    │
│  Reddit: 1,234 (+12%)                   │
│  X: 567 (-5%)                           │
│  今日新发现: 23 件商品                  │
├─────────────────────────────────────────┤
│  🏷️ 相关标签                            │
│  [Tag1] [Tag2] [Tag3]                   │
├─────────────────────────────────────────┤
│  商品列表                               │
└─────────────────────────────────────────┘
```

---

### 功能4: 商品出现活跃度图表
**优先级**: P2 (辅助决策)
**涉及页面**: `/product/[slug]`

**数据来源**: `productAppearanceStats`

**展示内容**:
- 近7/15/30/60天出现热力图
- 活跃度评分（基于出现频率计算）
- 持续热门天数统计

**技术说明**:
- 使用 `last7DaysBitmap`, `last30DaysBitmap`, `last60DaysBitmap` 字段
- Bitmap 每一位代表一天，1=出现，0=未出现
- 需要前端解析 Bitmap 并渲染热力图

**UI设计建议**:
```
活跃度: 🔥🔥🔥🔥⚪ (4/5)

近30天出现记录:
[日][一][二][三][四][五][六]
[■][■][□][■][■][■][□] 第1周
[■][□][■][■][□][■][■] 第2周
[■][■][■][□][■][■][■] 第3周
[□][■][■][■][■][□][■] 第4周

图例: ■ 出现  □ 未出现
```

---

### 功能5: 趋势变化可视化
**优先级**: P2 (增强趋势页)
**涉及页面**: `/trending` 和 `/product/[slug]`

**数据来源**: `trendRanks`

**展示内容**:
- 商品历史排名曲线（进入榜单的天数）
- 分数变化趋势
- 提及数增长趋势
- 排名变化指示器（上升/下降/持平）

**筛选维度**:
- 今日榜 (TODAY)
- 昨日榜 (YESTERDAY)
- 本周榜 (THIS_WEEK)
- 本月榜 (THIS_MONTH)

---

## 3. 详细需求

### 3.1 商品详情页改版设计

#### 页面结构
```
Product Detail Page
├── Header (面包屑)
├── Main Section
│   ├── Left: 商品图片
│   └── Right: 商品信息 + 关键数据
├── Stats Section (新增)
│   ├── Tab: 社交提及
│   ├── Tab: 出现活跃度
│   └── Tab: 排名趋势
└── Related Products
```

#### 新增组件需求
1. `ProductSocialStats` - 社交提及统计卡片
2. `ProductAppearanceHeatmap` - 出现热力图组件
3. `ProductTrendChart` - 趋势折线图组件
4. `CategoryTags` - 分类标签组件

---

### 3.2 分类详情页改版设计

#### 新增内容
在现有分类详情页顶部增加"热度统计"区域：

```tsx
// 新增组件
<TopicHeatStats
  categoryId={category.id}
  redditCount={heatStats.redditResultCount}
  xCount={heatStats.xResultCount}
  trendData={last7DaysData}
/>
```

---

## 4. 技术方案

### 4.1 前端技术栈

| 功能 | 推荐方案 | 说明 |
|------|---------|------|
| 折线图/趋势图 | Recharts | React 生态最常用的图表库 |
| 热力图 | 自定义组件 | 基于 Tailwind CSS 实现 |
| 数据获取 | Server Component | 利用 Next.js 15+ 服务端渲染 |
| 缓存策略 | ISR + fetch cache | 5分钟重新验证 |

### 4.2 组件设计

#### 社交提及图表组件
```tsx
interface ProductSocialChartProps {
  productId: string;
  data: {
    date: string;
    redditCount: number;
    xCount: number;
  }[];
}
```

#### 热力图组件
```tsx
interface AppearanceHeatmapProps {
  bitmap7Days: bigint;
  bitmap30Days: bigint;
  bitmap60Days: bigint;
}
```

---

## 5. 后端API改动

### 5.1 新增API端点

#### 5.1.1 获取商品社交统计
```http
GET /api/v1/products/:id/social-stats

Response:
{
  "data": {
    "today": { "reddit": 10, "x": 5 },
    "yesterday": { "reddit": 8, "x": 3 },
    "thisWeek": { "reddit": 50, "x": 25 },
    "thisMonth": { "reddit": 200, "x": 100 },
    "history": [
      { "date": "2026-03-01", "reddit": 5, "x": 2 },
      ...
    ]
  }
}
```

#### 5.1.2 获取商品出现统计
```http
GET /api/v1/products/:id/appearance-stats

Response:
{
  "data": {
    "last7DaysBitmap": "1110101",
    "last30DaysBitmap": "111111111111111111111111111111",
    "last60DaysBitmap": "...",
    "activeDays7": 5,
    "activeDays30": 25,
    "activityScore": 4.2
  }
}
```

#### 5.1.3 获取分类热度统计
```http
GET /api/v1/topics/:slug/heat-stats

Response:
{
  "data": {
    "today": { "reddit": 1234, "x": 567 },
    "yesterday": { "reddit": 1100, "x": 600 },
    "last7Days": { "reddit": 8000, "x": 3500 },
    "crawledProducts": 23,
    "trend": [
      { "date": "2026-03-01", "reddit": 1000, "x": 500 },
      ...
    ]
  }
}
```

#### 5.1.4 获取商品历史排名
```http
GET /api/v1/products/:id/trend-history

Response:
{
  "data": {
    "history": [
      {
        "date": "2026-03-01",
        "periodType": "TODAY",
        "rank": 5,
        "score": 85.5,
        "redditMentions": 100,
        "xMentions": 50
      },
      ...
    ]
  }
}
```

### 5.2 现有API增强

#### 5.2.1 商品详情API增强
在现有 `GET /api/v1/products/:id` 响应中增加：
```typescript
{
  "data": {
    // 现有字段...
    "categories": [
      { "id": "...", "name": "...", "slug": "..." }
    ],
    "firstSeenAt": "2026-01-15",
    "socialStats": { /* 最新统计数据 */ },
    "appearanceStats": { /* 活跃度统计 */ }
  }
}
```

### 5.3 Service层改动

#### 5.3.1 ProductService 新增方法
```typescript
// apps/api/src/modules/product/product.service.ts

async getProductSocialStats(productId: string): Promise<SocialStatsResponse>;
async getProductAppearanceStats(productId: string): Promise<AppearanceStatsResponse>;
async getProductTrendHistory(productId: string): Promise<TrendHistoryResponse>;
async getProductCategories(productId: string): Promise<Category[]>;
```

#### 5.3.2 新增 TopicHeatService
```typescript
// apps/api/src/modules/topic/topic-heat.service.ts

@Injectable()
export class TopicHeatService {
  async getCategoryHeatStats(categoryId: string): Promise<HeatStatsResponse>;
  async getCategoryHeatTrend(categoryId: string, days: number): Promise<HeatTrend[]>;
  async getCategoryRanking(): Promise<CategoryRank[]>;
}
```

### 5.4 Repository层改动

需要新增或修改以下查询：

```typescript
// 查询商品最新的社交统计
async findLatestSocialStats(productId: string): Promise<ProductSocialStats>;

// 查询商品最近的社交统计历史
async findSocialStatsHistory(productId: string, days: number): Promise<ProductSocialStats[]>;

// 查询商品出现统计
async findAppearanceStats(productId: string): Promise<ProductAppearanceStats>;

// 查询分类热度统计
async findCategoryHeatStats(categoryId: string, date: string): Promise<CategoryHeatStats>;

// 查询分类热度趋势
async findCategoryHeatTrend(categoryId: string, startDate: string, endDate: string): Promise<CategoryHeatStats[]>;

// 查询商品历史排名
async findProductTrendHistory(productId: string): Promise<TrendRank[]>;
```

---

## 6. 实施计划

### 阶段1: 后端API开发 (预计2-3天)
- [ ] 创建 DTO 类型定义
- [ ] 实现 Repository 查询方法
- [ ] 实现 Service 业务逻辑
- [ ] 实现 Controller API 端点
- [ ] 添加 Swagger 文档
- [ ] 单元测试

### 阶段2: 前端组件开发 (预计2-3天)
- [ ] 安装图表库 (Recharts)
- [ ] 实现基础数据展示组件
- [ ] 实现图表组件
- [ ] 实现热力图组件
- [ ] 单元测试

### 阶段3: 页面集成 (预计1-2天)
- [ ] 改版商品详情页
- [ ] 改版分类详情页
- [ ] 响应式适配
- [ ] 性能优化

### 阶段4: 测试与优化 (预计1天)
- [ ] 集成测试
- [ ] 性能测试
- [ ] Bug修复

---

## 附录

### A. 数据库表结构参考

详见: `packages/database/src/schema/tables.ts`

### B. 相关文档

- [前端开发规范](../apps/web/CLAUDE.md)
- [API开发规范](../apps/api/CLAUDE.md)
- [数据库Schema](../packages/database/src/schema/)

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-03-11 | v1.0 | 初始版本 | Claude |

---

*待确认事项*:
1. 是否需要实现所有列出的功能？
2. 功能优先级是否需要调整？
3. 是否有特定的UI/UX设计要求？
4. 是否需要考虑移动端适配的特殊需求？
