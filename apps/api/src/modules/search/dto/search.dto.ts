import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SourceType,
  type SearchProductsRequest,
  type SearchResultItem,
  type SearchProductsResponse,
  type SearchSuggestion,
} from '@good-trending/dto';

/**
 * 搜索查询 DTO
 * 实现 @good-trending/dto 的 SearchProductsRequest 接口
 */
export class SearchQueryDto implements SearchProductsRequest {
  @ApiProperty({
    description: '搜索关键词',
    example: 'airpods',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
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
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '数据来源平台筛选',
    enum: SourceType,
  })
  @IsOptional()
  @IsEnum(SourceType)
  discoveredFrom?: SourceType;

  @ApiPropertyOptional({
    description: '分类 ID 筛选',
    example: 'clh1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

/**
 * 搜索结果项 DTO
 * 实现 @good-trending/dto 的 SearchResultItem 接口
 */
export class SearchResultItemDto implements SearchResultItem {
  @ApiProperty({
    description: '商品 ID',
    example: 'clh1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '商品 slug',
    example: 'apple-airpods-pro-2',
  })
  slug: string;

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
    description: '商品图片',
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
    description: '数据来源平台',
    enum: SourceType,
  })
  discoveredFrom: SourceType;

  @ApiProperty({
    description: '相关度分数',
    example: 0.95,
  })
  relevanceScore: number;
}

/**
 * 搜索结果响应 DTO
 * 实现 @good-trending/dto 的 SearchProductsResponse 接口
 * 注意：Service 返回此结构，最终通过 TransformInterceptor 包装为 { data: { items, total, ... } }
 */
export class SearchResponseDto implements SearchProductsResponse {
  @ApiProperty({
    description: '搜索结果列表',
    type: [SearchResultItemDto],
  })
  items: SearchResultItemDto[];

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

  @ApiProperty({
    description: '搜索关键词',
    example: 'airpods',
  })
  query: string;
}

/**
 * 搜索建议 DTO
 * 实现 @good-trending/dto 的 SearchSuggestion 接口
 */
export class SearchSuggestionDto implements SearchSuggestion {
  @ApiProperty({
    description: '建议关键词',
    example: 'airpods pro',
  })
  text: string;

  @ApiProperty({
    description: '搜索结果数量',
    example: 150,
  })
  count: number;
}
