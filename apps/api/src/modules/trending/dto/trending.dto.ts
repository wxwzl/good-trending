import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Period,
  type GetTrendingRequest,
  type TrendingItem,
  type PaginatedTrendingResponse,
} from '@good-trending/dto';

// 重新导出 Period，以便其他模块可以继续从当前文件导入
export { Period } from '@good-trending/dto';

/**
 * 获取趋势数据 DTO
 * 实现 @good-trending/dto 的 GetTrendingRequest 接口
 */
export class GetTrendingDto implements GetTrendingRequest {
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
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '时间范围',
    enum: Period,
    default: Period.DAILY,
  })
  @IsOptional()
  @IsEnum(Period)
  period?: Period = Period.DAILY;

  @ApiPropertyOptional({
    description: '分类 ID 筛选',
    example: 'clh1234567890abcdef',
  })
  @IsOptional()
  topicId?: string;

  @ApiPropertyOptional({
    description: '开始日期',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期',
    example: '2026-03-05',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * 趋势项 DTO
 * 实现 @good-trending/dto 的 TrendingItem 接口
 */
export class TrendingItemDto implements TrendingItem {
  @ApiProperty({
    description: '趋势记录 ID',
    example: 'clh1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '排名',
    example: 1,
  })
  rank: number;

  @ApiProperty({
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  productId: string;

  @ApiProperty({
    description: '商品 Slug',
    example: 'apple-airpods-pro-2',
  })
  productSlug: string;

  @ApiProperty({
    description: '商品名称',
    example: 'Apple AirPods Pro 2',
  })
  productName: string;

  @ApiPropertyOptional({
    description: '商品图片',
    example: 'https://example.com/image.jpg',
  })
  productImage: string | null;

  @ApiPropertyOptional({
    description: '商品价格',
    example: '249.99',
  })
  productPrice: string | null;

  @ApiProperty({
    description: '趋势分数',
    example: 95.5,
  })
  score: number;

  @ApiProperty({
    description: '提及次数',
    example: 1500,
  })
  mentions: number;

  @ApiProperty({
    description: '浏览次数',
    example: 50000,
  })
  views: number;

  @ApiProperty({
    description: '点赞数',
    example: 2500,
  })
  likes: number;

  @ApiProperty({
    description: '日期',
    example: '2026-03-05',
  })
  date: string;
}

/**
 * 分页趋势响应 DTO
 * 实现 @good-trending/dto 的 PaginatedTrendingResponse 接口
 * 注意：Service 返回此结构，最终通过 TransformInterceptor 包装为 { data: { items, total, ... } }
 */
export class PaginatedTrendingResponseDto implements PaginatedTrendingResponse {
  @ApiProperty({
    description: '趋势列表',
    type: [TrendingItemDto],
  })
  items: TrendingItemDto[];

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
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages: number;
}
