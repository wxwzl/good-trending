import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from './common/cache';
import {
  ThrottlerConfigService,
  CustomThrottlerGuard,
} from './common/security';
import { HealthModule } from './modules/health';
import { ProductModule } from './modules/product';
import { TrendingModule } from './modules/trending';
import { TopicModule } from './modules/topic';
import { SearchModule } from './modules/search';
import { MonitoringModule } from './modules/monitoring';

@Module({
  imports: [
    // 配置模块 - 加载环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // 请求频率限制 - 全局 100 请求/分钟，搜索接口 20 请求/分钟
    ThrottlerModule.forRootAsync({
      useClass: ThrottlerConfigService,
    }),
    // 全局模块
    CacheModule,
    // 功能模块
    HealthModule,
    ProductModule,
    TrendingModule,
    TopicModule,
    SearchModule,
    MonitoringModule,
  ],
  controllers: [],
  providers: [
    // 全局频率限制守卫
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
