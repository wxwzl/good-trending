# 大数据量 API 流式处理方案

> 本文档描述当数据库数据量超出内存大小时，API 服务的流式处理实现方案。

---

## 目录

1. [概述](#1-概述)
2. [数据库层 - 游标处理](#2-数据库层---游标处理)
3. [Service 层 - AsyncGenerator](#3-service层---asyncgenerator)
4. [Controller 层 - 流式响应](#4-controller层---流式响应)
5. [前端接收处理](#5-前端接收处理)
6. [使用示例](#6-使用示例)
7. [方案对比](#7-方案对比)

---

## 1. 概述

### 问题场景

当数据库表数据量达到百万甚至千万级别时，传统的 `SELECT * FROM table` 会导致：

- 数据库内存压力剧增
- Node.js 进程 OOM (Out of Memory)
- 响应时间超时
- 服务崩溃

### 解决方案

采用**流式处理 (Streaming)** 架构，核心优势：

| 特性     | 传统方式       | 流式处理              |
| -------- | -------------- | --------------------- |
| 内存占用 | 与数据量成正比 | 恒定 (只缓存批次数据) |
| 响应时间 | 等待全部数据   | 首条数据立即返回      |
| 可扩展性 | 受限于单机内存 | 可处理无限数据        |
| 用户体验 | 长时间等待     | 实时看到数据          |

---

## 2. 数据库层 - 游标处理

### CursorService - 游标服务

```typescript
// apps/api/src/common/database/cursor.service.ts
import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { pool } from "@good-trending/database";

@Injectable()
export class CursorService {
  /**
   * 使用游标逐行读取大数据集
   * @param queryFn - 查询函数
   * @param batchSize - 每批读取数量，默认 1000
   */
  async *queryWithCursor<T>(
    queryFn: (client: PoolClient) => Promise<T[]>,
    batchSize: number = 1000
  ): AsyncGenerator<T, void, unknown> {
    const client = await pool.connect();

    try {
      // 开启事务
      await client.query("BEGIN");

      // 创建游标
      const cursorName = `cursor_${Date.now()}`;
      const query = queryFn.toString();
      await client.query(`DECLARE ${cursorName} CURSOR FOR ${query}`);

      let batch: T[];
      do {
        const result = await client.query(`FETCH ${batchSize} FROM ${cursorName}`);
        batch = result.rows;
        for (const row of batch) {
          yield row;
        }
      } while (batch.length > 0);

      await client.query(`CLOSE ${cursorName}`);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Keyset 分页查询 - 适合深度分页
   * 避免 OFFSET 性能问题
   */
  async *keysetPagination<T>(
    baseQuery: string,
    orderColumn: string,
    batchSize: number = 1000
  ): AsyncGenerator<T, void, unknown> {
    let lastValue: unknown = null;
    let hasMore = true;

    while (hasMore) {
      const whereClause = lastValue ? `WHERE ${orderColumn} > $1` : "";

      const query = `
        ${baseQuery}
        ${whereClause}
        ORDER BY ${orderColumn}
        LIMIT ${batchSize}
      `;

      const rows: T[] = lastValue ? await pool.query(query, [lastValue]) : await pool.query(query);

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        yield row;
      }

      lastValue = (rows[rows.length - 1] as Record<string, unknown>)[orderColumn];
      hasMore = rows.length === batchSize;
    }
  }
}
```

---

## 3. Service 层 - AsyncGenerator

### ProductService - 流式查询

```typescript
// apps/api/src/modules/product/product.service.ts
import { Injectable } from "@nestjs/common";
import { CursorService } from "@/common/database/cursor.service";
import { ProductFilterDto } from "./dto/product-filter.dto";

@Injectable()
export class ProductService {
  constructor(private cursorService: CursorService) {}

  /**
   * 流式获取所有商品 - 支持超大数据集
   * @param batchSize - 每批处理数量
   */
  async *streamAllProducts(batchSize: number = 1000): AsyncGenerator<Product, void, unknown> {
    const query = `
      SELECT id, name, slug, description, price, source_type, created_at
      FROM products
      ORDER BY created_at DESC
    `;

    for await (const row of this.cursorService.queryWithCursor<Product>(
      () => pool.query(query),
      batchSize
    )) {
      // 可以在这里进行数据转换或过滤
      yield this.transformRow(row);
    }
  }

  /**
   * 带过滤条件的流式查询
   */
  async *streamProductsByFilter(
    filters: ProductFilterDto,
    batchSize: number = 1000
  ): AsyncGenerator<Product, void, unknown> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.sourceType) {
      conditions.push(`source_type = $${values.length + 1}`);
      values.push(filters.sourceType);
    }

    if (filters.minPrice) {
      conditions.push(`price >= $${values.length + 1}`);
      values.push(filters.minPrice);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT * FROM products
      ${whereClause}
      ORDER BY created_at DESC
    `;

    for await (const row of this.cursorService.queryWithCursor<Product>(
      () => pool.query(query, values),
      batchSize
    )) {
      yield row;
    }
  }

  /**
   * 使用 Keyset 分页流式查询
   * 性能更好，适合有序数据
   */
  async *streamProductsKeyset(
    filters: ProductFilterDto,
    batchSize: number = 1000
  ): AsyncGenerator<Product, void, unknown> {
    let lastId: string | null = null;
    let lastCreatedAt: Date | null = null;
    let hasMore = true;

    while (hasMore) {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (filters.sourceType) {
        conditions.push(`source_type = $${values.length + 1}`);
        values.push(filters.sourceType);
      }

      // Keyset 分页条件
      if (lastId && lastCreatedAt) {
        conditions.push(`(created_at, id) < ($${values.length + 1}, $${values.length + 2})`);
        values.push(lastCreatedAt, lastId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const query = `
        SELECT * FROM products
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${batchSize}
      `;

      const rows: Product[] = await pool.query(query, values);

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of rows) {
        yield row;
      }

      const lastRow = rows[rows.length - 1];
      lastId = lastRow.id;
      lastCreatedAt = lastRow.createdAt;
      hasMore = rows.length === batchSize;
    }
  }

  private transformRow(row: unknown): Product {
    return row as Product;
  }
}
```

---

## 4. Controller 层 - 流式响应

### 4.1 SSE (Server-Sent Events)

适合实时推送场景，如实时数据监控、消息推送。

```typescript
// apps/api/src/modules/product/product.controller.ts
import { Controller, Get, Query, Res, Sse, Header } from "@nestjs/common";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { Response } from "express";
import { ProductService } from "./product.service";
import { ProductFilterDto } from "./dto/product-filter.dto";

@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * SSE 流式返回 - 适合实时数据推送
   * 客户端使用 EventSource 接收
   *
   * @example
   * const evtSource = new EventSource('/api/v1/products/stream');
   * evtSource.onmessage = (e) => console.log(JSON.parse(e.data));
   */
  @Sse("stream")
  async streamProducts(@Query() filters: ProductFilterDto): Promise<Observable<MessageEvent>> {
    const productStream = this.productService.streamProductsByFilter(filters);

    return from(productStream).pipe(
      map(
        (product) =>
          ({
            data: JSON.stringify(product),
            id: product.id,
            type: "product",
          }) as MessageEvent
      )
    );
  }
}
```

### 4.2 NDJSON (Newline Delimited JSON)

适合批量数据导出，每行一个 JSON 对象。

```typescript
/**
 * HTTP 流式响应 (application/x-ndjson) - 适合批量数据导出
 * 每行一个 JSON 对象，用换行分隔
 */
@Get('export')
@Header('Content-Type', 'application/x-ndjson')
@Header('Transfer-Encoding', 'chunked')
@Header('Cache-Control', 'no-cache')
@Header('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲
async exportProducts(
  @Query() filters: ProductFilterDto,
  @Res() response: Response
): Promise<void> {
  const productStream = this.productService.streamProductsByFilter(filters, 500);
  let count = 0;

  try {
    for await (const product of productStream) {
      // 写入一行 JSON + 换行符
      response.write(JSON.stringify(product) + '\n');
      count++;

      // 每 1000 条输出日志
      if (count % 1000 === 0) {
        console.log(`Exported ${count} products...`);
      }
    }

    response.write(JSON.stringify({ __end: true, count }) + '\n');
    response.end();
  } catch (error) {
    console.error('Export error:', error);
    response.write(JSON.stringify({ __error: error.message }) + '\n');
    response.end();
  }
}
```

### 4.3 Cursor 分页接口

适合移动端/前端分页加载，避免深度分页性能问题。

```typescript
interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * 分页游标接口 - 适合移动端/前端分页加载
 */
@Get('cursor')
async getProductsByCursor(
  @Query('cursor') cursor?: string,
  @Query('limit') limit: number = 50
): Promise<CursorPaginatedResponse<Product>> {
  // 限制最大 page size
  limit = Math.min(limit, 100);

  // 解码游标 (base64 编码的 lastId + lastCreatedAt)
  const decodedCursor = cursor ? this.decodeCursor(cursor) : null;

  const products = await this.productService.findByCursor(decodedCursor, limit);

  const nextCursor = products.length === limit
    ? this.encodeCursor(products[products.length - 1])
    : null;

  return {
    data: products,
    nextCursor,
    hasMore: products.length === limit
  };
}

private encodeCursor(product: Product): string {
  const payload = `${product.id}:${product.createdAt}`;
  return Buffer.from(payload).toString('base64');
}

private decodeCursor(cursor: string): { id: string; createdAt: Date } {
  const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
  const [id, createdAt] = decoded.split(':');
  return { id, createdAt: new Date(createdAt) };
}
```

---

## 5. 前端接收处理

### 5.1 NDJSON 流接收

```typescript
// apps/web/src/lib/stream-api.ts

/**
 * 接收 NDJSON 流并逐行处理
 * 使用 ReadableStream 实现真正的流式读取
 */
export async function* streamProducts(
  filters: ProductFilter
): AsyncGenerator<Product, void, unknown> {
  const response = await fetch(`/api/v1/products/export?${new URLSearchParams(filters)}`, {
    headers: { Accept: "application/x-ndjson" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行分割处理
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留未完成行

      for (const line of lines) {
        if (line.trim()) {
          const data = JSON.parse(line);

          // 检查特殊标记
          if (data.__end) {
            console.log(`Stream completed. Total: ${data.count}`);
            return;
          }
          if (data.__error) {
            throw new Error(data.__error);
          }

          yield data as Product;
        }
      }
    }

    // 处理最后剩余
    if (buffer.trim()) {
      yield JSON.parse(buffer) as Product;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 带进度回调的流式接收
 */
export async function* streamProductsWithProgress(
  filters: ProductFilter,
  onProgress?: (count: number) => void
): AsyncGenerator<Product, void, unknown> {
  let count = 0;

  for await (const product of streamProducts(filters)) {
    yield product;
    count++;

    if (count % 100 === 0) {
      onProgress?.(count);
    }
  }

  onProgress?.(count);
}
```

### 5.2 SSE 订阅

```typescript
/**
 * 使用 SSE (EventSource) 接收流
 * 适合实时数据推送场景
 */
export function subscribeProducts(
  filters: ProductFilter,
  onProduct: (product: Product) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): () => void {
  const params = new URLSearchParams(filters);
  const evtSource = new EventSource(`/api/v1/products/stream?${params}`);

  evtSource.onmessage = (event) => {
    try {
      const product = JSON.parse(event.data);
      onProduct(product);
    } catch (err) {
      onError?.(err as Error);
    }
  };

  evtSource.onerror = (err) => {
    onError?.(new Error("SSE connection error"));
    evtSource.close();
    onComplete?.();
  };

  // 返回取消订阅函数
  return () => evtSource.close();
}

/**
 * React Hook - SSE 订阅
 */
export function useProductStream(filters: ProductFilter) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(true);

    const unsubscribe = subscribeProducts(
      filters,
      (product) => {
        setProducts((prev) => [product, ...prev]);
      },
      (err) => {
        setError(err);
        setIsConnected(false);
      },
      () => {
        setIsConnected(false);
      }
    );

    return unsubscribe;
  }, [JSON.stringify(filters)]);

  return { products, error, isConnected };
}
```

---

## 6. 使用示例

### 6.1 导出所有商品到 CSV

```typescript
// 服务端生成 CSV
async function exportToCSV() {
  const csvWriter = createObjectCsvWriter({
    path: "products.csv",
    header: [
      { id: "id", title: "ID" },
      { id: "name", title: "Name" },
      { id: "price", title: "Price" },
    ],
  });

  let count = 0;
  for await (const product of streamProducts({ sourceType: "AMAZON" })) {
    await csvWriter.writeRecords([product]);
    count++;
  }

  console.log(`Exported ${count} products to CSV`);
}
```

### 6.2 实时显示新增商品 (React)

```tsx
function RealtimeProductList() {
  const { products, error, isConnected } = useProductStream({});

  return (
    <div>
      <div className="status">
        {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        {error && <span className="error">Error: {error.message}</span>}
      </div>
      <div className="product-list">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### 6.3 批量数据处理 (带进度)

```typescript
async function batchProcessProducts() {
  const processed: Product[] = [];
  const errors: { product: Product; error: Error }[] = [];

  for await (const product of streamProductsWithProgress({}, (count) => {
    console.log(`Processed ${count} products...`);
  })) {
    try {
      const result = await processProduct(product);
      processed.push(result);
    } catch (error) {
      errors.push({ product, error: error as Error });
    }
  }

  console.log(`Completed: ${processed.length} success, ${errors.length} errors`);
  return { processed, errors };
}
```

### 6.4 移动端无限滚动

```typescript
function useInfiniteProducts(initialCursor?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor || null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/products/cursor?cursor=${cursor || ""}&limit=20`);
      const data: CursorPaginatedResponse<Product> = await response.json();

      setProducts((prev) => [...prev, ...data.data]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  return { products, loadMore, hasMore, loading };
}
```

---

## 7. 方案对比

| 方案            | 适用场景               | 优点                       | 缺点                      |
| --------------- | ---------------------- | -------------------------- | ------------------------- |
| **SSE**         | 实时推送、数据持续流入 | 双向通信、自动重连、低延迟 | 浏览器连接数限制 (6/域名) |
| **NDJSON**      | 批量导出、大数据集下载 | 简单、可中断/恢复、易处理  | 单向传输                  |
| **Cursor 分页** | 移动端列表、无限滚动   | 性能稳定、支持跳页         | 需要维护游标状态          |
| **Keyset 分页** | 深度分页、有序数据     | O(1) 性能、无偏移量问题    | 只能顺序访问              |

### 性能对比

```typescript
// ❌ 传统 OFFSET 分页 - 越往后越慢
// OFFSET 1000000 LIMIT 10 需要扫描 1000010 行
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 1000000;

// ✅ Keyset 分页 - O(1) 性能
// 直接定位到游标位置
SELECT * FROM products
WHERE (created_at, id) < ('2024-01-01', 'xxx')
ORDER BY created_at DESC, id DESC
LIMIT 10;
```

### 内存占用对比

| 数据量   | 传统方式   | 流式处理 |
| -------- | ---------- | -------- |
| 1万条    | ~50MB      | ~5MB     |
| 10万条   | ~500MB     | ~5MB     |
| 100万条  | ~5GB (OOM) | ~5MB     |
| 1000万条 | 不可能     | ~5MB     |

---

## 参考

- [PostgreSQL Cursor Documentation](https://www.postgresql.org/docs/current/plpgsql-cursors.html)
- [MDN - ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [MDN - Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [NDJSON Specification](http://ndjson.org/)

---

_最后更新: 2026-03-07_
