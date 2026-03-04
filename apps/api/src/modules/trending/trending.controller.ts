import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TrendingService } from './trending.service';

@ApiTags('trending')
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  @ApiOperation({
    summary: '获取热门趋势商品',
    description: '获取指定日期的热门趋势商品',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: '日期 (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'topic',
    required: false,
    description: '分类 slug',
    example: 'electronics',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功获取热门趋势商品',
  })
  async getTrending(
    @Query('date') date?: string,
    @Query('topic') topic?: string,
    @Query('limit') limit?: string,
  ) {
    return this.trendingService.getTrending({
      date,
      topic,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
