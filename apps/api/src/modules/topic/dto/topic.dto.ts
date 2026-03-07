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

/**
 * 创建分类 DTO
 */
export class CreateTopicDto {
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
}

/**
 * 更新分类 DTO
 */
export class UpdateTopicDto {
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
}

/**
 * 获取分类列表 DTO
 */
export class GetTopicsDto {
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
 */
export class TopicResponseDto {
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
 * 分类详情（含商品数量）DTO
 */
export class TopicWithProductCountDto extends TopicResponseDto {
  @ApiProperty({
    description: '商品数量',
    example: 150,
  })
  productCount: number;
}

/**
 * 获取分类商品列表 DTO
 */
export class GetTopicProductsDto {
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
