# 数据库结构重构指南

## 变更概述

根据新的爬虫数据逻辑，对数据库表结构进行了全面重构。

## 主要变更

### 1. 删除的表

- `tag` - 标签表（文档未要求）
- `product_tag` - 商品标签关联表
- `product_history` - 商品历史表（被新表替代）
- `topic` - 原分类表（更名为 `category`）
- `product_topic` - 原商品分类关联表（更名为 `product_category`）
- `trend` - 原趋势表（被新表替代）
- `crawler_log` - 原爬虫日志表（结构变更）

### 2. 新增的表

#### categories (类目表)
- 原 `topic` 表的重命名和扩展
- 新增 `search_keywords` 字段用于 Google 搜索

#### category_heat_stats (类目热度统计表)
- 记录每个类目每天的 Google 搜索结果总数
- Reddit 和 X 平台的搜索结果数分开统计

#### product_appearance_stats (商品出现统计表)
- **核心表**：使用 Bitmap 存储近 7/15/30/60 天的出现次数
- 每个商品一条记录
- 使用 BigInt 存储位图（最多支持 60 位）

#### product_social_stats (商品社交提及统计表)
- 记录商品在各时间段的 Reddit/X 搜索结果数
- 支持：今日、昨日、本周、本月、近7/15/30/60天

#### trend_ranks (趋势榜单表)
- 基于社交提及数据计算的各类榜单
- 支持多种周期类型：TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, LAST_7_DAYS 等

### 3. 修改的表

#### products (商品表)
- 新增 `amazon_id` 字段（ASIN）
- 新增 `discovered_from` 字段（数据来源平台）
- 新增 `first_seen_at` 字段（首次发现日期）
- 移除 `source_id`, `source_type` 字段组合
- 移除 `updated_at` 的自动更新

#### crawler_logs (爬虫日志表)
- 新增 `task_type` 字段（任务类型）
- 新增 `category_id` 字段（关联类目）
- 扩展 `metadata` 字段存储更多信息

## Bitmap 存储说明

### 原理
使用 BigInt 的每一位代表某一天是否出现：
- 1 = 当天上榜
- 0 = 当天未上榜

每天执行滑动窗口操作：
1. 位图左移一位（`bitmap << 1`）
2. 设置今天的状态（`bitmap |= 1` 或不变）
3. 屏蔽超出窗口的位

### 示例
```
7天窗口示例：
Day:     1  2  3  4  5  6  7 (1=今天, 7=7天前)
Bitmap:  1  0  1  1  0  0  1

左移后： 0  1  0  1  1  0  0
今天出现：
         1  1  0  1  1  0  0

统计次数：bitcount = 4
```

### 工具函数
见 `packages/shared/src/utils/bitmap.ts`

## 迁移步骤

### 1. 备份数据（可选）
```bash
pg_dump good_trending > backup.sql
```

### 2. 清空数据库
```bash
cd packages/database
pnpm db:reset
```

### 3. 重新创建表结构
```bash
pnpm db:push
```

### 4. 重新生成迁移文件（如果需要）
```bash
pnpm db:generate
```

## 爬虫数据流程

### 每日爬取流程（每2小时）

1. **类目热度统计**
   - Google 搜索 `site:reddit.com 类目名称 after:[今天日期]`
   - 记录搜索结果总数到 `category_heat_stats`

2. **商品发现**
   - 爬取搜索结果，找出前10个亚马逊商品
   - 插入 `products` 表（已存在则跳过）
   - 更新 `product_appearance_stats` 的 Bitmap

3. **社交提及统计**
   - 以商品名称为关键词搜索 Reddit/X
   - 记录各时间段搜索结果数到 `product_social_stats`

### 每日凌晨流程（完整数据）

1. 搜索昨天一天的数据
2. 更新类目热度统计
3. 发现并保存商品
4. 更新商品 Bitmap 统计
5. 计算社交提及数据
6. 生成趋势榜单

## 查询示例

### 查询商品近7天出现次数
```typescript
const stats = await db.query.productAppearanceStats.findFirst({
  where: eq(productAppearanceStats.productId, productId),
});

const count = countBitmap(stats.last7DaysBitmap);
console.log(`近7天出现 ${count} 次`);
```

### 查询今日趋势榜单
```typescript
const ranks = await db.query.trendRanks.findMany({
  where: and(
    eq(trendRanks.periodType, 'TODAY'),
    eq(trendRanks.statDate, today)
  ),
  orderBy: asc(trendRanks.rank),
  with: {
    product: true,
  },
});
```

### 查询类目热度
```typescript
const heat = await db.query.categoryHeatStats.findMany({
  where: eq(categoryHeatStats.statDate, today),
  with: {
    category: true,
  },
});
```

## 数据清理策略

| 表名 | 清理策略 | 保留时间 | 命令 |
|------|----------|----------|------|
| trend_ranks (TODAY/YESTERDAY) | 自动删除 | 90 天 | `pnpm db:cleanup` |
| trend_ranks (THIS_WEEK/LAST_7/15/30) | 自动删除 | 1 年 | `pnpm db:cleanup` |
| trend_ranks (THIS_MONTH) | 永久保留 | 无限制 | - |
| product_social_stats | 自动删除 | 90 天 | `pnpm db:cleanup` |
| category_heat_stats | 自动删除 | 90 天 | `pnpm db:cleanup` |
| crawler_logs | 自动删除 | 30 天 | `pnpm db:cleanup` |

### 手动执行清理

```bash
cd packages/database
pnpm db:cleanup
```

### 设置定时任务（建议每天凌晨执行）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 3 点执行清理）
0 3 * * * cd /opt/good-trending/packages/database && pnpm db:cleanup >> /var/log/good-trending/cleanup.log 2>&1
```

## 注意事项

1. **Bitmap 限制**
   - 使用 JavaScript BigInt，最多支持 64 位
   - 当前设计使用 60 天窗口，完全够用

2. **时区处理**
   - 所有日期使用 UTC 存储
   - 爬虫任务按 UTC 时间调度

3. **数据清理**
   - 日榜/昨日榜保留 90 天，足够分析短期趋势
   - 周榜/月榜保留 1 年，用于长期分析
   - 爬虫日志只保留 30 天，减少空间占用

4. **索引优化**
   - 所有外键都有索引
   - 常用查询字段（date, rank, productId）都有索引
