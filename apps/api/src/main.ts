import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS 配置
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // API 前缀
  app.setGlobalPrefix('api');

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('Good-Trending API')
    .setDescription('商品趋势追踪平台 API 文档')
    .setVersion('1.0')
    .addTag('products', '商品相关接口')
    .addTag('trending', '趋势相关接口')
    .addTag('topics', '分类相关接口')
    .addTag('search', '搜索相关接口')
    .addTag('crawler', '爬虫管理接口')
    .addBearerAuth()
    .addServer('http://localhost:3001', '开发环境')
    .addServer('https://api.good-trending.com', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace('Controller', '')}_${methodKey}`,
  });

  // Swagger UI 路径
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Good-Trending API Docs',
  });

  // 导出 OpenAPI JSON
  if (process.env.NODE_ENV !== 'production') {
    const fs = await import('fs');
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api-docs`);
}
bootstrap();
