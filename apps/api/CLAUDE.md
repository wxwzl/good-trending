# API 开发规范

> 本文档定义了 Good-Trending API 服务的开发规范。涵盖 API 设计、数据库规范等内容。

---

## 目录

1. [API 规范](#1-api-规范)
2. [数据库规范](#2-数据库规范)

---

## 1. API 规范

### 1.1 RESTful API 设计

#### URL 规范

```
GET    /api/v1/products              # 获取商品列表
GET    /api/v1/products/:id          # 获取单个商品
GET    /api/v1/products/slug/:slug   # 通过 slug 获取商品
POST   /api/v1/products              # 创建商品（管理用）
PUT    /api/v1/products/:id          # 更新商品（管理用）
DELETE /api/v1/products/:id          # 删除商品（管理用）

GET    /api/v1/trending              # 获取热门趋势
GET    /api/v1/trending?period=daily # 按时间范围获取

GET    /api/v1/topics                # 获取分类列表
GET    /api/v1/topics/:slug          # 获取分类详情
GET    /api/v1/topics/:slug/products # 获取分类下的商品

GET    /api/v1/search?q=keyword      # 搜索商品

GET    /health                       # 健康检查
```

#### 统一响应格式（必须遵守）

**所有后端 API 必须遵守以下统一响应格式：**

```typescript
// ============================================
// 统一响应格式定义
// ============================================

// 成功响应 - 分页列表
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 成功响应 - 单个资源
interface SingleResponse<T> {
  data: T;
}

// 成功响应 - 无数据（删除、更新等操作）
interface SuccessResponse {
  success: true;
  message: string;
}

// 错误响应（统一格式）
interface ErrorResponse {
  statusCode: number; // HTTP 状态码
  message: string; // 错误消息
  error: string; // 错误类型
  timestamp: string; // 时间戳
  path: string; // 请求路径
  details?: Array<{
    // 可选：详细错误信息
    field: string;
    message: string;
  }>;
}
```

**NestJS 实现示例：**

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}

// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

#### 响应格式

```typescript
// 成功响应 - 分页列表
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 成功响应 - 单个资源
interface SingleResponse<T> {
  data: T;
}

// 错误响应
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 1.2 Swagger 文档规范

#### Controller 装饰器

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductController {
  @Get()
  @ApiOperation({
    summary: '获取商品列表',
    description: '支持分页、筛选和排序。默认按创建时间倒序排列。',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码，默认 1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量，默认 10，最大 100',
    example: 10,
  })
  @ApiQuery({
    name: 'sourceType',
    required: false,
    enum: ['TWITTER', 'AMAZON'],
    description: '数据来源筛选',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回商品列表',
    type: PaginatedProductDto,
  })
  @ApiResponse({
    status: 400,
    description: '参数错误',
  })
  async getProducts(@Query() query: GetProductsDto) {
    return this.productService.getProducts(query);
  }
}
```

#### DTO 装饰器

```typescript
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetProductsDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '数据来源',
    enum: ['TWITTER', 'AMAZON'],
  })
  @IsOptional()
  @IsEnum(['TWITTER', 'AMAZON'])
  sourceType?: 'TWITTER' | 'AMAZON';
}
```

### 1.3 API 类型规范（强制）

**所有接口的请求参数和响应参数类型必须使用和写在 `@good-trending/dto` 包中，禁止在 apps/api 项目中重复定义接口类型。**

#### DTO 实现方式

NestJS 的 DTO 类需要实现 `@good-trending/dto` 中的接口，并添加 Swagger 装饰器：

```typescript
// src/modules/product/dto/get-products.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SourceType,
  SortOrder,
  type GetProductsRequest,
} from '@good-trending/dto';

// 重新导出枚举，以便其他模块可以继续从当前文件导入
export { SourceType, SortOrder } from '@good-trending/dto';

/**
 * 获取商品列表 DTO
 * 实现 @good-trending/dto 的 GetProductsRequest 接口
 */
export class GetProductsDto implements GetProductsRequest {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '数据来源类型筛选',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;
}
```

```typescript
// src/modules/product/dto/product-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SourceType,
  type ProductResponse,
  type PaginatedProductsResponse,
} from '@good-trending/dto';

/**
 * 商品响应 DTO
 * 实现 @good-trending/dto 的 ProductResponse 接口
 * 用于 Swagger 文档生成
 */
export class ProductResponseDto implements ProductResponse {
  @ApiProperty({
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '商品名称',
    example: 'Apple AirPods Pro 2',
  })
  name: string;

  // ... 其他字段

  @ApiProperty({
    description: '数据来源类型',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  sourceType: SourceType;

  @ApiProperty({
    description: '创建时间',
    example: '2026-03-05T12:00:00.000Z',
  })
  createdAt: string;
}
```

#### 类型转换注意事项

服务层返回的数据需要转换为接口定义的类型（特别是 Date 类型需转为 ISO string）：

```typescript
// src/modules/product/product.service.ts
private mapToResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    // ...
    sourceType: product.sourceType as SourceType,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
```

#### 类型导入路径

| 子路径                        | 说明                         | 示例                                                                   |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `@good-trending/dto`          | 主入口，导出所有类型         | `import type { ProductResponse } from '@good-trending/dto'`            |
| `@good-trending/dto/common`   | 公共类型（枚举、分页参数等） | `import { SourceType, Period } from '@good-trending/dto/common'`       |
| `@good-trending/dto/request`  | 请求参数类型                 | `import type { GetProductsRequest } from '@good-trending/dto/request'` |
| `@good-trending/dto/response` | 响应数据类型                 | `import type { ProductResponse } from '@good-trending/dto/response'`   |

---

## 2. 数据库规范

### 2.1 Drizzle Schema 规范

```typescript
// packages/database/src/schema/tables.ts
import {
  pgTable,
  pgEnum,
  text,
  decimal,
  timestamp,
  integer,
  float,
  json,
  date,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// 枚举定义
export const sourceTypeEnum = pgEnum('source_type', ['X_PLATFORM', 'AMAZON']);
export const crawlerStatusEnum = pgEnum('crawler_status', [
  'RUNNING',
  'COMPLETED',
  'FAILED',
]);

// 模型定义
export const products = pgTable(
  'product',
  {
    // 主键
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    // 基本信息
    name: text('name').notNull(),
    description: text('description'),
    image: text('image'),

    // 来源信息
    sourceUrl: text('source_url').unique().notNull(),
    sourceId: text('source_id').notNull(),
    sourceType: sourceTypeEnum('source_type').notNull(),

    // 价格信息
    price: decimal('price', { precision: 10, scale: 2 }),
    currency: text('currency').default('USD').notNull(),

    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('product_source_idx').on(table.sourceType, table.sourceId),
    index('product_created_at_idx').on(table.createdAt),
  ],
);
```

### 2.2 命名规范

| 类型     | 规范            | 示例                    |
| -------- | --------------- | ----------------------- |
| 表名     | 小写下划线      | `product_topics`        |
| 字段名   | 小写下划线      | `trending_score`        |
| 枚举     | 大驼峰          | `SourceType`            |
| 索引     | `index("name")` | `index("product_idx")`  |
| 唯一约束 | `.unique()`     | `text("slug").unique()` |

---

## 参考

- [项目代码宪法](../../CLAUDE.md)
- [前端开发规范](../web/CLAUDE.md)
- [测试规范](../tests/CLAUDE.md)

---

_最后更新: 2026-03-07_
