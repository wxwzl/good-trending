import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SourceType } from '../../product/dto/get-products.dto';

/**
 * 搜索查询 DTO
 */
export class SearchQueryDto {
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
    description: '数据来源筛选',
    enum: SourceType,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({
    description: '分类 ID 筛选',
    example: 'clh1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  topicId?: string;
}

/**
 * 搜索结果项 DTO
 */
export class SearchResultItemDto {
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
    description: '商品图片',
    example: 'https://example.com/image.jpg',
  })
  image?: string;

  @ApiPropertyOptional({
    description: '商品价格',
    example: '249.99',
  })
  price?: string;

  @ApiProperty({
    description: '来源类型',
    enum: SourceType,
  })
  sourceType: SourceType;

  @ApiProperty({
    description: '相关度分数',
    example: 0.95,
  })
  relevanceScore: number;
}

/**
 * 搜索结果响应 DTO
 */
export class SearchResponseDto {
  @ApiProperty({
    description: '搜索结果列表',
    type: [SearchResultItemDto],
  })
  data: SearchResultItemDto[];

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
    description: '搜索关键词',
    example: 'airpods',
  })
  query: string;
}

/**
 * 搜索建议 DTO
 */
export class SearchSuggestionDto {
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
