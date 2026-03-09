/**
 * 请求频率限制配置
 *
 * 全局限制: 100 请求/分钟 (可通过环境变量配置)
 * 搜索接口: 20 请求/分钟
 *
 * 环境变量:
 * - RATE_LIMIT_WINDOW_MS: 限流窗口时间（毫秒），默认 60000 (1分钟)
 * - RATE_LIMIT_MAX_REQUESTS: 限流最大请求数，默认 100
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerOptionsFactory,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';

/**
 * Throttler 配置工厂
 * 定义全局频率限制规则
 */
@Injectable()
export class ThrottlerConfigService implements ThrottlerOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    // 从环境变量读取配置，使用默认值
    const defaultTtl = this.configService.get<number>(
      'RATE_LIMIT_WINDOW_MS',
      60000,
    );
    const defaultLimit = this.configService.get<number>(
      'RATE_LIMIT_MAX_REQUESTS',
      100,
    );

    // 搜索接口使用更严格的限制（默认限制的 20%）
    const searchLimit = Math.max(10, Math.floor(defaultLimit * 0.2));

    return {
      throttlers: [
        {
          name: 'default',
          ttl: defaultTtl,
          limit: defaultLimit,
        },
        {
          name: 'search', // 搜索接口特殊限制
          ttl: defaultTtl,
          limit: searchLimit,
        },
      ],
    };
  }
}

/**
 * 自定义 Throttler Guard
 * 支持不同接口使用不同的频率限制
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * 根据路由选择对应的 throttler
   * 搜索接口使用 'search' throttler (20 req/min)
   * 其他接口使用 'default' throttler (100 req/min)
   */
  protected async getThrottlerName(context: ExecutionContext): Promise<string> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    // 搜索接口使用更严格的限制
    if (path?.includes('/search')) {
      return 'search';
    }

    return 'default';
  }
}
