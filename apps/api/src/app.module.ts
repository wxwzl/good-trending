import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProductModule } from './modules/product/product.module';
import { TrendingModule } from './modules/trending/trending.module';
import { TopicModule } from './modules/topic/topic.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 限流模块
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 分钟
        limit: 100, // 每分钟 100 次请求
      },
    ]),

    // 业务模块
    ProductModule,
    TrendingModule,
    TopicModule,
    SearchModule,
    HealthModule,
  ],
})
export class AppModule {}
