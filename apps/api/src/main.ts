/**
 * Good-Trending API 入口文件
 * 必须在最开始加载环境变量
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// 根据 APP_ENV 加载对应的 .env 文件
// 优先级（从低到高，后加载的覆盖先加载的）：
// 1. .env（默认）
// 2. .env.local（本地覆盖）
// 3. .env.{APP_ENV}（特定环境）
// 4. .env.{APP_ENV}.local（最高优先级）
const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const rootDir = resolve(__dirname, '../../../');

const envFiles = [
  '.env', // 默认（最低优先级）
  '.env.local', // 本地覆盖
  `.env.${appEnv}`, // 特定环境
  `.env.${appEnv}.local`, // 最高优先级
];

const loadedEnvFiles: string[] = [];
for (const envFile of envFiles) {
  const result = config({ path: resolve(rootDir, envFile), override: true });
  if (!result.error) {
    loadedEnvFiles.push(envFile);
  }
}

if (loadedEnvFiles.length > 0) {
  console.log(`[api] Loaded environment files: ${loadedEnvFiles.join(' -> ')}`);
} else {
  console.log(
    '[api] Warning: No environment file found, using system environment variables',
  );
}
console.log(`[api] Starting with DATABASE_URL=${process.env.DATABASE_URL},`);
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import {
  TransformInterceptor,
  HttpExceptionFilter,
  WinstonLoggerService,
} from './common';

async function bootstrap() {
  // 创建 Winston Logger
  const logger = new WinstonLoggerService();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
    bufferLogs: true,
  });

  // 启用日志刷新
  app.flushLogs();

  // ============================================================
  // 响应压缩配置 (Gzip)
  // 减少响应体积，提高传输效率
  // ============================================================
  app.use(
    compression({
      // 压缩阈值：只压缩大于 1KB 的响应
      threshold: 1024,
      // 压缩级别：1-9，6 是性能和压缩率的平衡点
      level: 6,
      // 过滤函数：确定哪些响应需要压缩
      filter: (req, res) => {
        // 如果请求头中明确要求不压缩，则不压缩
        if (req.headers['x-no-compression']) {
          return false;
        }
        // 使用默认的压缩过滤逻辑
        return compression.filter(req, res);
      },
    }),
  );

  // 安全 Headers 配置 (Helmet)
  app.use(
    helmet({
      // X-Content-Type-Options: 防止 MIME 类型嗅探
      xContentTypeOptions: true,
      // X-Frame-Options: 防止点击劫持
      xFrameOptions: { action: 'deny' },
      // X-XSS-Protection: XSS 过滤器 (现代浏览器已弃用，但仍为旧浏览器提供保护)
      xXssProtection: true,
      // 禁用 X-Powered-By 头，隐藏技术栈信息
      xPoweredBy: false,
      // Strict-Transport-Security (HSTS) - 强制 HTTPS
      hsts: {
        maxAge: 31536000, // 1 年
        includeSubDomains: true,
        preload: true,
      },
      // Content-Security-Policy - 通过 Next.js 前端配置，这里不重复设置
      contentSecurityPolicy: false,
    }),
  );

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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Good-Trending API')
    .setDescription(
      '商品热门趋势追踪平台 API 文档\n\n' +
        '## 响应格式\n' +
        '- 成功响应: `{ "data": ... }`\n' +
        '- 分页响应: `{ "data": { "items": [...], "total": 100, "page": 1, "limit": 10, "totalPages": 10 } }`\n' +
        '- 错误响应: `{ "statusCode": 400, "message": "...", "error": "Bad Request", "timestamp": "...", "path": "..." }`',
    )
    .setVersion('1.0')
    .addTag('health', '健康检查接口')
    .addTag('monitoring', '系统监控接口')
    .addTag('products', '商品管理接口')
    .addTag('trending', '热门趋势接口')
    .addTag('topics', '分类管理接口')
    .addTag('search', '搜索接口')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  logger.log(`
  ┌─────────────────────────────────────────────┐
  │  Good-Trending API Server                   │
  │  Port: ${port}                                │
  │  API Prefix: /api/v1                        │
  │  Swagger Docs: http://localhost:${port}/api-docs │
  └─────────────────────────────────────────────┘
  `);
}

bootstrap();
