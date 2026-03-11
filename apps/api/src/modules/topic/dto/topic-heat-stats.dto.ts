import { ApiProperty } from '@nestjs/swagger';
import {
  type TopicHeatStatsResponse,
  type SocialPlatformStats,
  type CategoryHeatTrendItem,
} from '@good-trending/dto';

/**
 * 社交平台统计数据 DTO
 */
class SocialPlatformStatsDto implements SocialPlatformStats {
  @ApiProperty({
    description: 'Reddit 搜索结果数',
    example: 1234,
  })
  reddit: number;

  @ApiProperty({
    description: 'X 平台搜索结果数',
    example: 567,
  })
  x: number;
}

/**
 * 分类热度趋势数据项 DTO
 */
class CategoryHeatTrendItemDto implements CategoryHeatTrendItem {
  @ApiProperty({
    description: '日期',
    example: '2026-03-01',
  })
  date: string;

  @ApiProperty({
    description: 'Reddit 搜索结果数',
    example: 1000,
  })
  reddit: number;

  @ApiProperty({
    description: 'X 平台搜索结果数',
    example: 500,
  })
  x: number;
}

/**
 * 分类热度统计响应 DTO
 * GET /api/v1/topics/:slug/heat-stats
 */
export class TopicHeatStatsResponseDto implements TopicHeatStatsResponse {
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
    description: '近7天统计',
    type: SocialPlatformStatsDto,
  })
  last7Days: SocialPlatformStatsDto;

  @ApiProperty({
    description: '今日爬取到的商品数量',
    example: 23,
  })
  crawledProducts: number;

  @ApiProperty({
    description: '近7天趋势数据',
    type: [CategoryHeatTrendItemDto],
  })
  trend: CategoryHeatTrendItemDto[];
}
