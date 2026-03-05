import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 数据来源类型
 */
export enum SourceType {
  X_PLATFORM = 'X_PLATFORM',
  AMAZON = 'AMAZON',
}

/**
 * 排序字段
 */
export enum SortField {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
}

/**
 * 排序方向
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 获取商品列表 DTO
 */
export class GetProductsDto {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
    example: 1,
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
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '数据来源类型筛选',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiPropertyOptional({
    description: '关键词搜索',
    example: 'airpods',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: SortField,
    default: SortField.CREATED_AT,
    example: SortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
