import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './common/cache';
import { HealthModule } from './modules/health';
import { ProductModule } from './modules/product';
import { TrendingModule } from './modules/trending';
import { TopicModule } from './modules/topic';
import { SearchModule } from './modules/search';

@Module({
  imports: [
    // 配置模块 - 加载环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // 全局模块
    CacheModule,
    // 功能模块
    HealthModule,
    ProductModule,
    TrendingModule,
    TopicModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
