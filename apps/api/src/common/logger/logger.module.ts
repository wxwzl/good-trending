import { Global, Module } from '@nestjs/common';
import { WinstonLoggerService } from './logger.service';

/**
 * Winston Logger 模块
 * 全局提供日志服务
 */
@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class LoggerModule {}
