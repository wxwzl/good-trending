import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { SystemStatsResponseDto, CrawlerStatsDto } from './dto/stats.dto';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 获取系统统计信息
   */
  @Get('stats')
  @ApiOperation({
    summary: '获取系统统计信息',
    description: '返回数据库统计、来源分布、趋势统计、爬虫状态等系统监控数据',
  })
  @ApiResponse({
    status: 200,
    description: '系统统计信息',
    type: SystemStatsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: '服务器错误',
  })
  async getStats(): Promise<SystemStatsResponseDto> {
    return this.monitoringService.getSystemStats();
  }

  /**
   * 获取爬虫状态统计
   */
  @Get('crawler')
  @ApiOperation({
    summary: '获取爬虫状态统计',
    description: '返回爬虫运行、完成、失败的数量及最近运行时间',
  })
  @ApiResponse({
    status: 200,
    description: '爬虫状态统计',
    type: CrawlerStatsDto,
  })
  async getCrawlerStats(): Promise<CrawlerStatsDto> {
    return this.monitoringService.getCrawlerStats();
  }
}
