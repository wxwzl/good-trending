# PostgreSQL 分区表管理指南

## 概述

本项目使用 PostgreSQL 原生分区功能对大数据量表进行分区管理。

### 分区表列表

| 表名                  | 分区类型         | 分区键      | 分区粒度 | 用途                 |
| --------------------- | ---------------- | ----------- | -------- | -------------------- |
| `product_social_stat` | 范围分区 (RANGE) | `stat_date` | 按月     | 商品社交提及统计数据 |

---

## 为什么使用分区？

### 1. 性能优化

- **查询裁剪**：按时间范围查询时，只扫描相关分区
- **索引效率**：分区内的索引更小，查询更快

### 2. 存储管理

- **生命周期管理**：旧数据可按分区快速删除（DROP 比 DELETE 快 100 倍）
- **独立备份**：可单独备份/恢复某个分区

### 3. 维护便利

- **并发操作**：不同分区可并行维护
- **数据清理**：清理旧数据只需 DROP 分区表

---

## 分区表架构

```
product_social_stat (父表 - 不存储数据)
├── product_social_stat_2026_01 (2026年1月分区)
├── product_social_stat_2026_02 (2026年2月分区)
├── product_social_stat_2026_03 (2026年3月分区)
└── ... (更多分区)
```

---

## 管理操作

### 1. 查看所有分区

```sql
-- 查看分区表结构
SELECT
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'product_social_stat';
```

### 2. 手动创建新分区

```sql
-- 创建指定月份的分区
SELECT create_monthly_partition('product_social_stat', 2026, 5);

-- 将创建: product_social_stat_2026_05
```

### 3. 清理旧分区

```sql
-- 清理 36 个月前的分区
SELECT * FROM cleanup_old_partitions('product_social_stat', 36);
```

---

## 自动化管理

### 定时任务 (data-cleanup)

**执行时间**：每天凌晨 5:00

**执行内容**：

1. 清理 36 个月前的旧分区
2. 创建未来 2 个月的新分区

```typescript
// apps/scheduler/src/jobs/data-cleanup/processor.ts
const config = {
  retentionMonths: 36, // 保留3年数据
  targetTable: "product_social_stat",
};
```

---

## Drizzle ORM 集成

### 重要说明

Drizzle ORM **不原生支持** PostgreSQL 分区表定义，因此采用以下策略：

1. **Schema 定义**：在 `tables.ts` 中定义表结构，用于类型推断和查询构建
2. **分区创建**：通过自定义 SQL 迁移 (`migrations/0001_partition_social_stats.sql`) 创建分区表
3. **应用启动**：确保分区表已存在（由 data-cleanup 任务维护）

### Schema 定义注意事项

```typescript
// packages/database/src/schema/tables.ts
export const productSocialStats = pgTable(
  "product_social_stat",
  {
    id: text("id").notNull(), // ⚠️ 注意：没有 .primaryKey()
    statDate: date("stat_date").notNull(),
    // ... 其他字段
  },
  (table) => [
    // 分区表主键必须包含分区键
    primaryKey({ columns: [table.id, table.statDate] }),
    // 业务唯一索引
    uniqueIndex("social_stat_product_date_idx").on(table.productId, table.statDate),
  ]
);
```

**关键限制**：

- 主键必须包含分区键 (`stat_date`)
- 唯一索引必须包含分区键

---

## 初始化流程

### 新环境部署

```bash
# 1. 执行 Drizzle 迁移（创建普通表）
pnpm db:migrate

# 2. 执行分区迁移（转换为分区表）
psql -d $DATABASE_URL -f packages/database/migrations/0001_partition_social_stats.sql

# 3. 启动调度器，自动创建未来分区
pnpm --filter @good-trending/scheduler start
```

### 分区迁移脚本说明

`0001_partition_social_stats.sql` 执行以下操作：

1. 重命名原表为备份 (`product_social_stat_backup`)
2. 创建分区父表 (`PARTITION BY RANGE (stat_date)`)
3. 创建初始分区（最近3个月 + 未来1个月）
4. 创建管理函数：
   - `create_monthly_partition()` - 创建新分区
   - `cleanup_old_partitions()` - 清理旧分区

---

## 常见问题

### Q1: 插入数据时提示分区不存在？

**原因**：未来分区未提前创建

**解决**：

```sql
-- 手动创建所需月份的分区
SELECT create_monthly_partition('product_social_stat', 2026, 6);
```

或确保 data-cleanup 任务正常运行。

### Q2: 查询时性能没有提升？

**检查**：

```sql
-- 查看查询计划是否使用分区裁剪
EXPLAIN ANALYZE
SELECT * FROM product_social_stat
WHERE stat_date >= '2026-03-01' AND stat_date < '2026-04-01';
```

**预期结果**：应显示 `Partition Ref` 只引用相关分区。

### Q3: 如何修改分区表结构？

**方式**：修改父表，子分区自动继承

```sql
-- 添加新列到父表
ALTER TABLE product_social_stat ADD COLUMN new_column TEXT;

-- 所有分区自动继承
```

---

## 监控与告警

### 关键指标

| 指标     | 检查方式              | 告警阈值 |
| -------- | --------------------- | -------- |
| 分区数量 | 检查是否覆盖未来2个月 | < 2      |
| 分区大小 | 单个分区大小          | > 10GB   |
| 过期分区 | 3年前的分区是否已清理 | > 0      |

### 监控 SQL

```sql
-- 分区统计
SELECT
    child.relname AS partition_name,
    pg_total_relation_size(child.oid) / 1024 / 1024 AS size_mb,
    pg_get_expr(child.relpartbound, child.oid) AS bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'product_social_stat'
ORDER BY child.relname;
```

---

## 相关文件

| 文件                                          | 说明                |
| --------------------------------------------- | ------------------- |
| `src/schema/tables.ts`                        | Drizzle Schema 定义 |
| `migrations/0001_partition_social_stats.sql`  | 分区表初始化脚本    |
| `../../apps/scheduler/src/jobs/data-cleanup/` | 分区维护定时任务    |

---

## 参考文档

- [PostgreSQL 分区表官方文档](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
