/**
 * Good-Trending API 入口文件
 * 必须在最开始加载环境变量
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// 从项目根目录加载 .env 文件（必须在所有其他导入之前）
config({ path: resolve(__dirname, '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor, HttpExceptionFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 配置
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // 全局 API 前缀
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger 文档配置
  const config = new DocumentBuilder()
    .setTitle('Good-Trending API')
    .setDescription(
      '商品热门趋势追踪平台 API 文档\n\n' +
        '## 响应格式\n' +
        '- 成功响应: `{ "data": ... }`\n' +
        '- 分页响应: `{ "data": [...], "total": 100, "page": 1, "limit": 10, "totalPages": 10 }`\n' +
        '- 错误响应: `{ "statusCode": 400, "message": "...", "error": "Bad Request", "timestamp": "...", "path": "..." }`',
    )
    .setVersion('1.0')
    .addTag('health', '健康检查接口')
    .addTag('products', '商品管理接口')
    .addTag('trending', '热门趋势接口')
    .addTag('topics', '分类管理接口')
    .addTag('search', '搜索接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.API_PORT || process.env.PORT || 3001;
  await app.listen(port);

  console.log(`
  ┌─────────────────────────────────────────────┐
  │  Good-Trending API Server                   │
  │  Port: ${port}                                │
  │  API Prefix: /api/v1                        │
  │  Swagger Docs: http://localhost:${port}/api-docs │
  └─────────────────────────────────────────────┘
  `);
}

bootstrap();
