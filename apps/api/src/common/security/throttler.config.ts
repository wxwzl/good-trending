/**
 * 请求频率限制配置
 *
 * 全局限制: 100 请求/分钟
 * 搜索接口: 20 请求/分钟
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
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
  createThrottlerOptions(): ThrottlerModuleOptions {
    return {
      throttlers: [
        {
          name: 'default',
          ttl: 60000, // 1 分钟 (毫秒)
          limit: 100, // 每分钟 100 次请求
        },
        {
          name: 'search', // 搜索接口特殊限制
          ttl: 60000, // 1 分钟 (毫秒)
          limit: 20, // 每分钟 20 次请求
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
