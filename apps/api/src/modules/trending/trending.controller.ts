import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TrendingService } from './trending.service';
import {
  GetTrendingDto,
  PaginatedTrendingResponseDto,
} from './dto/trending.dto';

@ApiTags('trending')
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  /**
   * 获取热门趋势
   * GET /api/v1/trending
   */
  @Get()
  @ApiOperation({
    summary: '获取热门趋势',
    description:
      '获取商品热门趋势数据。支持按时间范围（daily/weekly/monthly）筛选。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回趋势数据',
    type: PaginatedTrendingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '参数错误',
  })
  async getTrending(
    @Query() query: GetTrendingDto,
  ): Promise<PaginatedTrendingResponseDto> {
    return this.trendingService.getTrending(query);
  }

  /**
   * 获取每日趋势
   * GET /api/v1/trending/daily
   */
  @Get('daily')
  @ApiOperation({
    summary: '获取每日趋势',
    description: '获取今日热门趋势数据。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回每日趋势数据',
    type: PaginatedTrendingResponseDto,
  })
  async getDailyTrending(
    @Query() query: Omit<GetTrendingDto, 'period'>,
  ): Promise<PaginatedTrendingResponseDto> {
    return this.trendingService.getDailyTrending(query);
  }

  /**
   * 获取每周趋势
   * GET /api/v1/trending/weekly
   */
  @Get('weekly')
  @ApiOperation({
    summary: '获取每周趋势',
    description: '获取本周热门趋势数据。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回每周趋势数据',
    type: PaginatedTrendingResponseDto,
  })
  async getWeeklyTrending(
    @Query() query: Omit<GetTrendingDto, 'period'>,
  ): Promise<PaginatedTrendingResponseDto> {
    return this.trendingService.getWeeklyTrending(query);
  }

  /**
   * 获取每月趋势
   * GET /api/v1/trending/monthly
   */
  @Get('monthly')
  @ApiOperation({
    summary: '获取每月趋势',
    description: '获取本月热门趋势数据。',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回每月趋势数据',
    type: PaginatedTrendingResponseDto,
  })
  async getMonthlyTrending(
    @Query() query: Omit<GetTrendingDto, 'period'>,
  ): Promise<PaginatedTrendingResponseDto> {
    return this.trendingService.getMonthlyTrending(query);
  }

  /**
   * 获取指定分类的趋势
   * GET /api/v1/trending/topic/:slug
   */
  @Get('topic/:slug')
  @ApiOperation({
    summary: '获取分类趋势',
    description: '获取指定分类下的热门趋势数据。',
  })
  @ApiParam({
    name: 'slug',
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回分类趋势数据',
    type: PaginatedTrendingResponseDto,
  })
  async getTrendingByTopic(
    @Param('slug') slug: string,
    @Query() query: GetTrendingDto,
  ): Promise<PaginatedTrendingResponseDto> {
    return this.trendingService.getTrendingByTopic(slug, query);
  }
}
