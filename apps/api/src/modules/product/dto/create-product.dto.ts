import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SourceType } from './get-products.dto';

/**
 * 创建商品 DTO
 */
export class CreateProductDto {
  @ApiProperty({
    description: '商品名称',
    example: 'Apple AirPods Pro 2',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({
    description: '商品描述',
    example: 'Active Noise Cancellation wireless earbuds',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '商品图片 URL',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description: '商品价格',
    example: 249.99,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: '货币单位',
    default: 'USD',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: '来源 URL',
    example: 'https://twitter.com/user/status/123',
  })
  @IsUrl()
  @IsNotEmpty()
  sourceUrl: string;

  @ApiProperty({
    description: '来源 ID',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiProperty({
    description: '数据来源类型',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  @IsEnum(SourceType)
  sourceType: SourceType;
}
