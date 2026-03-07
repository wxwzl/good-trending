/**
 * @good-trending/dto
 *
 * Good-Trending 项目前后端共享的 API 类型定义包
 *
 * 本包只包含 TypeScript 类型定义和接口，不包含任何实体类或实现代码。
 * 用于确保前后端 API 请求参数和响应数据的一致性。
 *
 * @example
 * ```typescript
 * // 前端使用
 * import { GetProductsRequest, ProductResponse } from '@good-trending/dto';
 *
 * async function fetchProducts(params: GetProductsRequest): Promise<ProductResponse> {
 *   const res = await fetch('/api/v1/products?' + new URLSearchParams(params));
 *   return res.json();
 * }
 *
 * // 后端使用
 * import { GetProductsRequest, ProductResponse } from '@good-trending/dto';
 *
 * @Get()
 * async getProducts(@Query() query: GetProductsRequest): Promise<ProductResponse> {
 *   return this.productService.getProducts(query);
 * }
 * ```
 */

// 公共类型
export * from './common';

// 请求参数类型
export * from './request';

// 响应数据类型
export * from './response';
