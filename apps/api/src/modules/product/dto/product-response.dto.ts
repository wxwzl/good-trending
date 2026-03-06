import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from './get-products.dto';

/**
 * 商品响应 DTO
 */
export class ProductResponseDto {
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
    description: '来源 ID',
    example: '1234567890',
  })
  sourceId: string;

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
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2026-03-05T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * 分页商品响应 DTO
 * 注意：Service 返回此结构，最终通过 TransformInterceptor 包装为 { data: { items, total, ... } }
 */
export class PaginatedProductResponseDto {
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
