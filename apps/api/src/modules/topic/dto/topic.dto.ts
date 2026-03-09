import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  type CreateTopicRequest,
  type UpdateTopicRequest,
  type GetTopicsRequest,
  type GetTopicProductsRequest,
  type TopicResponse,
  type TopicWithProductCount,
  type PaginatedTopicsResponse,
  type PaginatedTopicProductsResponse,
} from '@good-trending/dto';
import { ProductResponseDto } from '../../product/dto/product-response.dto';

/**
 * 创建分类 DTO
 * 实现 @good-trending/dto 的 CreateTopicRequest 接口
 */
export class CreateTopicDto implements CreateTopicRequest {
  @ApiProperty({
    description: '分类名称',
    example: 'Electronics',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: '分类 slug',
    example: 'electronics',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    description: '分类描述',
    example: 'Electronic devices and accessories',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '分类图片 URL',
    example: 'https://example.com/topic-image.jpg',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: '搜索关键词（用于 Google 搜索）',
    example: 'electronics, gadgets, tech',
  })
  @IsOptional()
  @IsString()
  searchKeywords?: string;
}

/**
 * 更新分类 DTO
 * 实现 @good-trending/dto 的 UpdateTopicRequest 接口
 */
export class UpdateTopicDto implements UpdateTopicRequest {
  @ApiPropertyOptional({
    description: '分类名称',
    example: 'Electronics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: '分类描述',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '分类图片 URL',
    example: 'https://example.com/new-image.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: '搜索关键词（用于 Google 搜索）',
    example: 'electronics, gadgets, tech',
  })
  @IsOptional()
  @IsString()
  searchKeywords?: string;
}

/**
 * 获取分类列表 DTO
 * 实现 @good-trending/dto 的 GetTopicsRequest 接口
 */
export class GetTopicsDto implements GetTopicsRequest {
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
}

/**
 * 分类响应 DTO
 * 实现 @good-trending/dto 的 TopicResponse 接口
 */
export class TopicResponseDto implements TopicResponse {
  @ApiProperty({
    description: '分类 ID',
    example: 'clh1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '分类名称',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: '分类 slug',
    example: 'electronics',
  })
  slug: string;

  @ApiPropertyOptional({
    description: '分类描述',
    example: 'Electronic devices and accessories',
  })
  description?: string;

  @ApiPropertyOptional({
    description: '分类图片 URL',
    example: 'https://example.com/topic-image.jpg',
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: '搜索关键词（用于 Google 搜索）',
    example: 'electronics, gadgets, tech',
  })
  searchKeywords?: string;

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

  @ApiProperty({
    description: '商品数量',
    example: 150,
  })
  productCount: number;
}

/**
 * 分类详情（含商品数量）DTO
 * 实现 @good-trending/dto 的 TopicWithProductCount 接口
 */
export class TopicWithProductCountDto
  extends TopicResponseDto
  implements TopicWithProductCount {}

/**
 * 获取分类商品列表 DTO
 * 实现 @good-trending/dto 的 GetTopicProductsRequest 接口
 */
export class GetTopicProductsDto implements GetTopicProductsRequest {
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
}

/**
 * 分页分类响应 DTO
 * 实现 @good-trending/dto 的 PaginatedTopicsResponse 接口
 */
export class PaginatedTopicResponseDto implements PaginatedTopicsResponse {
  @ApiProperty({
    description: '分类列表',
    type: [TopicWithProductCountDto],
  })
  items: TopicWithProductCountDto[];

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

/**
 * 分页分类商品响应 DTO
 * 实现 @good-trending/dto 的 PaginatedTopicProductsResponse 接口
 */
export class PaginatedTopicProductsResponseDto implements PaginatedTopicProductsResponse {
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
