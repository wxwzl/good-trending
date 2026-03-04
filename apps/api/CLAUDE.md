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

---

## 2. 数据库规范

### 2.1 Prisma Schema 规范

```prisma
// 枚举定义
enum SourceType {
  TWITTER
  AMAZON
}

// 模型定义
model Product {
  // 主键
  id             String         @id @default(uuid())

  // 基本信息
  name           String         @db.VarChar(255)
  slug           String         @unique @db.VarChar(255)
  description    String?        @db.Text
  imageUrl       String?        @db.VarChar(500)

  // 来源信息
  sourceUrl      String         @db.VarChar(500)
  sourceType     SourceType
  sourceId       String         @db.VarChar(100)

  // 价格信息
  price          Decimal?       @db.Decimal(10, 2)
  currency       String         @default("USD") @db.VarChar(10)

  // 统计数据
  rating         Decimal?       @db.Decimal(3, 2)
  reviewCount    Int            @default(0)
  viewCount      Int            @default(0)
  trendingScore  Int            @default(0)

  // 状态
  isActive       Boolean        @default(true)

  // 时间戳
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // 关联关系
  topics         ProductTopic[]
  tags           ProductTag[]
  trends         Trend[]
  history        ProductHistory[]

  // 复合唯一索引
  @@unique([sourceType, sourceId])

  // 查询优化索引
  @@index([trendingScore(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([sourceType])

  // 表名映射
  @@map("products")
}
```

### 2.2 命名规范

| 类型     | 规范                | 示例                   |
| -------- | ------------------- | ---------------------- |
| 表名     | 小写下划线          | `product_topics`       |
| 字段名   | 小驼峰              | `trendingScore`        |
| 枚举     | 大驼峰              | `SourceType`           |
| 索引     | `@@index([field])`  | `@@index([createdAt])` |
| 唯一约束 | `@@unique([field])` | `@@unique([slug])`     |

---

## 参考

- [项目代码宪法](../../CLAUDE.md)
- [前端开发规范](../web/CLAUDE.md)
- [测试规范](../tests/CLAUDE.md)

---

_最后更新: 2026-03-04_
