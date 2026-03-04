import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SourceType } from '@prisma/client';

// 查询 DTO
export class ProductQueryDto {
  @ApiPropertyOptional({
    description: '页码，从 1 开始',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: '数据来源类型筛选',
    enum: SourceType,
    example: SourceType.AMAZON,
  })
  @IsEnum(SourceType)
  @IsOptional()
  sourceType?: SourceType;

  @ApiPropertyOptional({
    description: '分类 ID 筛选',
    example: 'clx123456789',
  })
  @IsString()
  @IsOptional()
  topicId?: string;

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'laptop',
  })
  @IsString()
  @IsOptional()
  keyword?: string;
}

// 响应 DTO
export class ProductResponseDto {
  @ApiProperty({
    description: '商品唯一标识',
    example: 'clx123456789',
  })
  id: string;

  @ApiProperty({
    description: '商品名称',
    example: 'Apple MacBook Pro 14"',
  })
  name: string;

  @ApiPropertyOptional({
    description: '商品描述',
    example: '最新款 MacBook Pro，搭载 M3 芯片',
  })
  description?: string;

  @ApiPropertyOptional({
    description: '商品图片 URL',
    example: 'https://example.com/image.jpg',
  })
  image?: string;

  @ApiPropertyOptional({
    description: '商品价格',
    example: 1999.99,
  })
  price?: number;

  @ApiProperty({
    description: '货币单位',
    example: 'USD',
    default: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: '来源平台商品链接',
    example: 'https://amazon.com/dp/B0XXXXXXX',
  })
  sourceUrl: string;

  @ApiProperty({
    description: '来源平台商品 ID',
    example: 'B0XXXXXXX',
  })
  sourceId: string;

  @ApiProperty({
    description: '数据来源类型',
    enum: SourceType,
    example: SourceType.AMAZON,
  })
  sourceType: SourceType;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-16T08:20:00Z',
  })
  updatedAt: Date;
}
