import { ApiProperty } from '@nestjs/swagger';
import { type ProductAppearanceStatsResponse } from '@good-trending/dto';

/**
 * 商品出现统计响应 DTO
 * GET /api/v1/products/:id/appearance-stats
 */
export class ProductAppearanceStatsResponseDto implements ProductAppearanceStatsResponse {
  @ApiProperty({
    description: '近7天位图（二进制字符串，1=出现，0=未出现）',
    example: '1110101',
  })
  last7DaysBitmap: string;

  @ApiProperty({
    description: '近30天位图',
    example: '111111111111111111111111111111',
  })
  last30DaysBitmap: string;

  @ApiProperty({
    description: '近60天位图',
    example: '111111111111111111111111111111111111111111111111111111111111',
  })
  last60DaysBitmap: string;

  @ApiProperty({
    description: '近7天活跃天数',
    example: 5,
  })
  activeDays7: number;

  @ApiProperty({
    description: '近30天活跃天数',
    example: 25,
  })
  activeDays30: number;

  @ApiProperty({
    description: '活跃度评分（0-5）',
    example: 4.2,
  })
  activityScore: number;
}
