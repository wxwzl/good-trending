import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';
import { Logger } from 'winston';
import { createWinstonLogger } from './winston.config';

/**
 * NestJS 兼容的 Winston Logger 服务
 * 支持上下文和元数据记录
 */
@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements NestLoggerService {
  private context?: string;
  private readonly logger: Logger;

  constructor() {
    this.logger = createWinstonLogger();
  }

  /**
   * 设置日志上下文
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 格式化元数据
   */
  private formatMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...(this.context && { context: this.context }),
      ...meta,
    };
  }

  /**
   * 记录日志
   */
  log(message: string, meta?: Record<string, unknown>): void;
  log(message: string, context?: string, meta?: Record<string, unknown>): void;
  log(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): void {
    let context: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta;
      metadata = meta;
    } else {
      metadata = contextOrMeta;
      context = this.context;
    }

    this.logger.info(message, { context, ...metadata });
  }

  /**
   * 记录错误
   */
  error(message: string, trace?: string, meta?: Record<string, unknown>): void;
  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  error(
    message: string,
    trace?: string,
    contextOrMeta?: string | Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): void {
    let context: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta;
      metadata = meta;
    } else {
      metadata = contextOrMeta;
      context = this.context;
    }

    this.logger.error(message, { context, trace, ...metadata });
  }

  /**
   * 记录警告
   */
  warn(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  warn(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): void {
    let context: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta;
      metadata = meta;
    } else {
      metadata = contextOrMeta;
      context = this.context;
    }

    this.logger.warn(message, { context, ...metadata });
  }

  /**
   * 记录调试信息
   */
  debug(message: string, meta?: Record<string, unknown>): void;
  debug(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  debug(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): void {
    let context: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta;
      metadata = meta;
    } else {
      metadata = contextOrMeta;
      context = this.context;
    }

    this.logger.debug(message, { context, ...metadata });
  }

  /**
   * 详细日志
   */
  verbose(message: string, meta?: Record<string, unknown>): void;
  verbose(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void;
  verbose(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
    meta?: Record<string, unknown>,
  ): void {
    let context: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (typeof contextOrMeta === 'string') {
      context = contextOrMeta;
      metadata = meta;
    } else {
      metadata = contextOrMeta;
      context = this.context;
    }

    this.logger.verbose?.(message, { context, ...metadata });
  }
}
