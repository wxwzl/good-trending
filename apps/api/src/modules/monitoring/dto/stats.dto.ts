import { ApiProperty } from '@nestjs/swagger';

/**
 * 数据库统计信息
 */
export class DatabaseStatsDto {
  @ApiProperty({
    description: '商品总数',
    example: 1234,
  })
  productCount: number;

  @ApiProperty({
    description: '趋势记录总数',
    example: 5678,
  })
  trendCount: number;

  @ApiProperty({
    description: '分类总数',
    example: 15,
  })
  categoryCount: number;

  @ApiProperty({
    description: '爬虫日志总数',
    example: 45,
  })
  crawlerLogCount: number;
}

/**
 * 来源统计信息
 */
export class SourceStatsDto {
  @ApiProperty({
    description: 'X平台商品数量',
    example: 500,
  })
  xPlatformCount: number;

  @ApiProperty({
    description: '亚马逊商品数量',
    example: 734,
  })
  amazonCount: number;

  @ApiProperty({
    description: 'Reddit商品数量',
    example: 300,
  })
  redditCount: number;
}

/**
 * 趋势统计信息
 */
export class TrendStatsDto {
  @ApiProperty({
    description: '今日趋势商品数量',
    example: 50,
  })
  todayCount: number;

  @ApiProperty({
    description: '本周趋势商品数量',
    example: 200,
  })
  weekCount: number;

  @ApiProperty({
    description: '本月趋势商品数量',
    example: 800,
  })
  monthCount: number;

  @ApiProperty({
    description: '平均趋势分数',
    example: 75.5,
  })
  avgScore: number;
}

/**
 * 系统统计响应
 */
export class SystemStatsResponseDto {
  @ApiProperty({
    description: '统计时间戳',
    example: '2026-03-05T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '数据库统计信息',
    type: DatabaseStatsDto,
  })
  database: DatabaseStatsDto;

  @ApiProperty({
    description: '来源统计信息',
    type: SourceStatsDto,
  })
  sources: SourceStatsDto;

  @ApiProperty({
    description: '趋势统计信息',
    type: TrendStatsDto,
  })
  trends: TrendStatsDto;

  @ApiProperty({
    description: '系统运行时间（秒）',
    example: 86400,
  })
  uptime: number;

  @ApiProperty({
    description: '内存使用情况',
    example: { heapUsed: 50, heapTotal: 100, rss: 80 },
  })
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

/**
 * 爬虫状态统计
 */
export class CrawlerStatsDto {
  @ApiProperty({
    description: '运行中的爬虫数量',
    example: 2,
  })
  running: number;

  @ApiProperty({
    description: '已完成的爬虫数量',
    example: 100,
  })
  completed: number;

  @ApiProperty({
    description: '失败的爬虫数量',
    example: 5,
  })
  failed: number;

  @ApiProperty({
    description: '最近一次爬虫时间',
    example: '2026-03-05T12:00:00.000Z',
    nullable: true,
  })
  lastRunTime: string | null;
}
