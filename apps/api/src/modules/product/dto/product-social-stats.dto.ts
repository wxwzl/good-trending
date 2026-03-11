import { ApiProperty } from '@nestjs/swagger';
import {
  type ProductSocialStatsResponse,
  type SocialPlatformStats,
} from '@good-trending/dto';

/**
 * 社交平台统计数据 DTO
 */
class SocialPlatformStatsDto implements SocialPlatformStats {
  @ApiProperty({
    description: 'Reddit 提及数',
    example: 10,
  })
  reddit: number;

  @ApiProperty({
    description: 'X 平台提及数',
    example: 5,
  })
  x: number;
}

/**
 * 社交统计历史记录项 DTO
 */
class SocialHistoryItemDto {
  @ApiProperty({
    description: '日期',
    example: '2026-03-01',
  })
  date: string;

  @ApiProperty({
    description: 'Reddit 提及数',
    example: 5,
  })
  reddit: number;

  @ApiProperty({
    description: 'X 平台提及数',
    example: 2,
  })
  x: number;
}

/**
 * 商品社交统计响应 DTO
 * GET /api/v1/products/:id/social-stats
 */
export class ProductSocialStatsResponseDto implements ProductSocialStatsResponse {
  @ApiProperty({
    description: '今日统计',
    type: SocialPlatformStatsDto,
  })
  today: SocialPlatformStatsDto;

  @ApiProperty({
    description: '昨日统计',
    type: SocialPlatformStatsDto,
  })
  yesterday: SocialPlatformStatsDto;

  @ApiProperty({
    description: '本周统计',
    type: SocialPlatformStatsDto,
  })
  thisWeek: SocialPlatformStatsDto;

  @ApiProperty({
    description: '本月统计',
    type: SocialPlatformStatsDto,
  })
  thisMonth: SocialPlatformStatsDto;

  @ApiProperty({
    description: '历史数据（近30天每日数据）',
    type: [SocialHistoryItemDto],
  })
  history: SocialHistoryItemDto[];
}
