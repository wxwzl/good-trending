import { ApiProperty } from '@nestjs/swagger';
import {
  type ProductTrendHistoryResponse,
  type ProductTrendHistoryItem,
} from '@good-trending/dto';

/**
 * 商品趋势历史记录项 DTO
 */
class ProductTrendHistoryItemDto implements ProductTrendHistoryItem {
  @ApiProperty({
    description: '日期',
    example: '2026-03-01',
  })
  date: string;

  @ApiProperty({
    description:
      '榜单类型: TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, LAST_7_DAYS, LAST_15_DAYS, LAST_30_DAYS',
    example: 'TODAY',
  })
  periodType: string;

  @ApiProperty({
    description: '排名',
    example: 5,
  })
  rank: number;

  @ApiProperty({
    description: '趋势分数',
    example: 85.5,
  })
  score: number;

  @ApiProperty({
    description: 'Reddit 提及数',
    example: 100,
  })
  redditMentions: number;

  @ApiProperty({
    description: 'X 平台提及数',
    example: 50,
  })
  xMentions: number;
}

/**
 * 商品趋势历史响应 DTO
 * GET /api/v1/products/:id/trend-history
 */
export class ProductTrendHistoryResponseDto implements ProductTrendHistoryResponse {
  @ApiProperty({
    description: '历史记录列表',
    type: [ProductTrendHistoryItemDto],
  })
  history: ProductTrendHistoryItemDto[];
}
