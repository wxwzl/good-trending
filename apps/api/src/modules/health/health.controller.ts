import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({
    summary: '健康检查',
    description: '检查 API 服务是否正常运行',
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
  })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'API 根路径',
    description: '返回 API 基本信息',
  })
  @ApiResponse({
    status: 200,
    description: 'API 信息',
  })
  root() {
    return {
      name: 'Good-Trending API',
      version: '1.0.0',
      docs: '/api-docs',
    };
  }
}
