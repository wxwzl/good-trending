import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SourceType,
  type ProductResponse,
  type PaginatedProductsResponse,
  type CategoryBrief,
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

  @ApiProperty({
    description: '商品 slug',
    example: 'apple-airpods-pro-2',
  })
  slug: string;

  @ApiPropertyOptional({
    description: '商品描述',
    example: 'Active Noise Cancellation wireless earbuds',
  })
  description?: string;

  @ApiPropertyOptional({
    description: '商品图片 URL',
    example: 'https://example.com/image.jpg',
  })
  image?: string;

  @ApiPropertyOptional({
    description: '商品价格',
    example: '249.99',
  })
  price?: string;

  @ApiPropertyOptional({
    description: '货币单位',
    example: 'USD',
  })
  currency?: string;

  @ApiProperty({
    description: '来源 URL',
    example: 'https://twitter.com/user/status/123',
  })
  sourceUrl: string;

  @ApiProperty({
    description: '亚马逊商品 ID (ASIN)',
    example: 'B0BDHWDR12',
  })
  amazonId: string;

  @ApiProperty({
    description: '数据来源平台（从哪里发现的）',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  discoveredFrom: SourceType;

  @ApiProperty({
    description: '首次发现的日期',
    example: '2026-03-05',
  })
  firstSeenAt: string;

  @ApiProperty({
    description: '创建时间',
    example: '2026-03-05T12:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: '更新时间',
    example: '2026-03-05T12:00:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '所属分类列表',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clh1234567890abcdef' },
        name: { type: 'string', example: 'Electronics' },
        slug: { type: 'string', example: 'electronics' },
      },
    },
  })
  categories?: CategoryBrief[];
}

/**
 * 分页商品响应 DTO
 * 实现 @good-trending/dto 的 PaginatedProductsResponse 接口
 * 注意：Service 返回此结构，最终通过 TransformInterceptor 包装为 { data: { items, total, ... } }
 */
export class PaginatedProductResponseDto implements PaginatedProductsResponse {
  @ApiProperty({
    description: '商品列表',
    type: [ProductResponseDto],
  })
  items: ProductResponseDto[];

  @ApiProperty({
    description: '总数量',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '总页数',
    example: 10,
  })
  totalPages: number;
}
