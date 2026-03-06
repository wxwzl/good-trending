import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { databaseHealthCheck, getPoolStatus } from '@good-trending/database';
import { redisHealthCheck } from '@good-trending/database';

/**
 * 服务健康状态
 */
interface ServiceHealth {
  status: 'ok' | 'error' | 'degraded';
  latency?: number;
  error?: string;
}

/**
 * 详细健康检查响应
 */
interface HealthCheckResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
  pool?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly version = process.env.npm_package_version || '1.0.0';

  constructor() {}

  /**
   * 简单健康检查
   * 用于负载均衡器和 Kubernetes 探针
   */
  @Get()
  @ApiOperation({
    summary: '健康检查',
    description: '检查 API 服务是否正常运行',
  })
  @ApiResponse({
    status: 200,
    description: '服务正常',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-03-05T12:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * 详细健康检查
   * 包含所有依赖服务的状态
   */
  @Get('detailed')
  @ApiOperation({
    summary: '详细健康检查',
    description: '检查 API 服务及所有依赖服务（数据库、Redis）的运行状态',
  })
  @ApiResponse({
    status: 200,
    description: '详细服务状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-03-05T12:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        version: { type: 'string', example: '1.0.0' },
        services: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                latency: { type: 'number', example: 5 },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                latency: { type: 'number', example: 2 },
              },
            },
          },
        },
        pool: {
          type: 'object',
          properties: {
            totalCount: { type: 'number', example: 5 },
            idleCount: { type: 'number', example: 3 },
            waitingCount: { type: 'number', example: 0 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '服务不可用',
  })
  async checkDetailed(): Promise<HealthCheckResponse> {
    // 并行检查所有服务
    const [dbHealth, redisHealth] = await Promise.all([
      databaseHealthCheck(),
      redisHealthCheck(),
    ]);

    // 计算整体状态
    let overallStatus: 'ok' | 'error' | 'degraded' = 'ok';

    if (dbHealth.status === 'error' || redisHealth.status === 'error') {
      // 数据库错误导致整体不可用
      if (dbHealth.status === 'error') {
        overallStatus = 'error';
      } else {
        overallStatus = 'degraded'; // Redis 错误降级但不影响核心功能
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.version,
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
      pool: getPoolStatus(),
    };
  }

  /**
   * 就绪检查
   * 用于 Kubernetes readiness probe
   */
  @Get('ready')
  @ApiOperation({
    summary: '就绪检查',
    description: '检查服务是否准备好接收请求',
  })
  @ApiResponse({
    status: 200,
    description: '服务就绪',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2026-03-05T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '服务未就绪',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: false },
        reason: { type: 'string', example: 'Database connection failed' },
        timestamp: { type: 'string', example: '2026-03-05T12:00:00.000Z' },
      },
    },
  })
  async checkReady() {
    const dbHealth = await databaseHealthCheck();

    if (dbHealth.status === 'error') {
      return {
        ready: false,
        reason: dbHealth.error || 'Database connection failed',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 存活检查
   * 用于 Kubernetes liveness probe
   */
  @Get('live')
  @ApiOperation({
    summary: '存活检查',
    description: '检查服务进程是否存活',
  })
  @ApiResponse({
    status: 200,
    description: '服务存活',
    schema: {
      type: 'object',
      properties: {
        alive: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2026-03-05T12:00:00.000Z' },
      },
    },
  })
  checkLive() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }
}
