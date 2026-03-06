# 测试规范

> 本文档定义了 Good-Trending 项目的测试规范。涵盖单元测试、集成测试和 E2E 测试。

---

## 目录

1. [测试类型与覆盖率](#1-测试类型与覆盖率)
2. [API 接口测试规范](#2-api-接口测试规范)
3. [测试命令](#3-测试命令)
4. [测试用例编写规范](#4-测试用例编写规范)

---

## 1. 测试类型与覆盖率

| 类型     | 工具          | 覆盖率要求 | 位置                  |
| -------- | ------------- | ---------- | --------------------- |
| 单元测试 | Vitest / Jest | > 70%      | 各应用 `*.test.ts`    |
| 集成测试 | Vitest        | > 60%      | `apps/tests/src/api/` |
| E2E 测试 | Playwright    | 核心流程   | `apps/tests/src/e2e/` |

---

## 2. API 接口测试规范

**重要：所有 API 接口测试必须根据 Swagger 文档进行编写。**

### 2.1 测试编写流程

```
1. 访问 Swagger 文档
   - 开发环境: http://localhost:3015/api-docs
   - 查看 API 的请求参数、响应格式、状态码

2. 根据 Swagger 定义编写测试
   - 验证请求参数（必填、可选、类型、范围）
   - 验证响应格式（符合统一响应格式）
   - 验证状态码（200, 400, 404, 500 等）

3. 测试用例覆盖
   - 正常场景（Happy Path）
   - 边界情况（空值、最大值、最小值）
   - 异常场景（无效参数、权限错误）
```

### 2.2 Swagger 文档示例

```yaml
# Swagger 定义的 API
/api/v1/products:
  get:
    summary: 获取商品列表
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 10
    responses:
      "200":
        description: 成功返回商品列表
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PaginatedResponse"
      "400":
        description: 参数错误
```

### 2.3 对应的测试用例

```typescript
// apps/tests/src/api/products.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupMockServer, resetMockData } from "../mocks/server";

describe("Products API - 根据 Swagger 文档编写", () => {
  setupMockServer();

  beforeEach(() => {
    resetMockData();
  });

  describe("GET /api/v1/products", () => {
    // Swagger: summary: 获取商品列表
    // Swagger: response 200: 成功返回商品列表

    it("should_return_paginated_products_with_default_params", async () => {
      // 根据 Swagger 默认值测试
      const response = await fetch("/api/v1/products");
      const data = await response.json();

      // 验证状态码
      expect(response.status).toBe(200);

      // 验证响应格式（统一响应格式）
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.total).toBeDefined();
      expect(data.page).toBe(1); // Swagger default: 1
      expect(data.limit).toBe(10); // Swagger default: 10
      expect(data.totalPages).toBeDefined();
    });

    // Swagger: parameter limit - minimum: 1, maximum: 100
    it("should_respect_limit_parameter_constraints", async () => {
      // 测试最大值限制
      const response = await fetch("/api/v1/products?limit=200");
      const data = await response.json();

      expect(data.limit).toBeLessThanOrEqual(100); // Swagger maximum: 100
    });

    // Swagger: parameter page - minimum: 1
    it("should_handle_invalid_page_as_bad_request", async () => {
      const response = await fetch("/api/v1/products?page=-1");

      // Swagger: response 400: 参数错误
      expect(response.status).toBe(400);
    });

    // Swagger: response 200 schema
    it("should_match_paginated_response_schema", async () => {
      const response = await fetch("/api/v1/products?page=1&limit=5");
      const data = await response.json();

      // 验证统一响应格式
      expect(data).toMatchObject({
        data: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe("GET /api/v1/products/:id", () => {
    // Swagger: summary: 获取单个商品

    it("should_return_single_product_with_valid_id", async () => {
      const productId = "valid-uuid-here";
      const response = await fetch(`/api/v1/products/${productId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(productId);
    });

    // Swagger: response 404
    it("should_return_404_for_non_existent_product", async () => {
      const response = await fetch("/api/v1/products/non-existent-id");

      expect(response.status).toBe(404);
    });
  });
});
```

### 2.4 E2E 测试根据 Swagger 编写

```typescript
// apps/tests/src/e2e/api/products.spec.ts
import { test, expect } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL || "http://localhost:3001";

test.describe("Products API - E2E Tests (根据 Swagger)", () => {
  // 根据 Swagger 的 GET /api/v1/products 编写
  test("GET /api/v1/products 应返回分页数据", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products`);

    // Swagger: response 200
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // 验证统一响应格式
    expect(data.data).toBeDefined();
    expect(data.total).toBeDefined();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  // 根据 Swagger 的分页参数测试
  test("GET /api/v1/products 分页参数应正确工作", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/products?page=2&limit=5`);

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.page).toBe(2);
    expect(data.limit).toBe(5);
  });
});
```

---

## 3. 测试命令

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行 API 测试
pnpm test:api

# 运行 E2E 测试
pnpm test:e2e

# 生成覆盖率报告
pnpm test:coverage
```

---

## 4. 测试用例编写规范

### 4.1 AAA 模式

```typescript
describe("ProductService", () => {
  let service: ProductService;
  let repository: MockType<Repository<Product>>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new ProductService(repository);
  });

  describe("getProducts", () => {
    it("should_return_paginated_products_when_valid_params", async () => {
      // Arrange (准备)
      const params = { page: 1, limit: 10 };
      repository.findMany.mockResolvedValue([mockProduct]);

      // Act (执行)
      const result = await service.getProducts(params);

      // Assert (断言)
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(repository.findMany).toHaveBeenCalledWith(params);
    });

    it("should_throw_error_when_page_is_negative", async () => {
      // Arrange
      const params = { page: -1, limit: 10 };

      // Act & Assert
      await expect(service.getProducts(params)).rejects.toThrow(BadRequestException);
    });

    it("should_limit_max_page_size_to_100", async () => {
      // Arrange
      const params = { page: 1, limit: 200 };

      // Act
      const result = await service.getProducts(params);

      // Assert
      expect(result.limit).toBe(100);
    });
  });
});
```

### 4.2 测试命名规范

```typescript
// 格式: should_{expected_behavior}_when_{condition}
it("should_return_empty_array_when_no_products_exist", async () => {});
it("should_calculate_correct_total_pages", async () => {});
it("should_handle_concurrent_requests_safely", async () => {});
```

---

## 参考

- [项目代码宪法](../../CLAUDE.md)
- [前端开发规范](../web/CLAUDE.md)
- [API 开发规范](../api/CLAUDE.md)

---

_最后更新: 2026-03-04_
