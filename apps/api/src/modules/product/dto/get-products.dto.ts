import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SourceType,
  SortOrder,
  type GetProductsRequest,
} from '@good-trending/dto';

// 重新导出 SourceType 和 SortOrder，以便其他模块可以继续从当前文件导入
export { SourceType, SortOrder } from '@good-trending/dto';

/**
 * 排序字段
 */
export enum SortField {
  CREATED_AT = 'createdAt',
  PRICE = 'price',
  NAME = 'name',
}

/**
 * 获取商品列表 DTO
 * 实现 @good-trending/dto 的 GetProductsRequest 接口
 */
export class GetProductsDto implements GetProductsRequest {
  @ApiPropertyOptional({
    description: '页码',
    default: 1,
    minimum: 1,
    example: 1,
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
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '数据来源平台筛选',
    enum: SourceType,
    example: SourceType.X_PLATFORM,
  })
  @IsOptional()
  @IsEnum(SourceType)
  discoveredFrom?: SourceType;

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
