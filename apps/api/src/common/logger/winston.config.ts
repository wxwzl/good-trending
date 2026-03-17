import { join } from 'path';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, json, errors, printf, colorize } = format;

// 日志目录
const logsDir = process.env.LOGS_DIR || join(process.cwd(), 'logs');

// 自定义控制台输出格式
const consoleFormat = printf(
  ({ level, message, timestamp, context, trace, ...metadata }) => {
    let msg = `${timestamp} [${level}]`;
    if (context) {
      msg += ` [${context}]`;
    }
    msg += ` ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    if (trace) {
      msg += `\n${trace}`;
    }
    return msg;
  },
);

// 创建 DailyRotateFile transport
const createDailyRotateTransport = (level: string, filename: string) => {
  return new DailyRotateFile({
    level,
    filename: join(logsDir, filename),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: combine(timestamp(), json()),
  });
};

// Winston 配置
export const winstonConfig = {
  // 开发环境配置
  development: {
    level: 'debug',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      colorize({ all: true }),
      consoleFormat,
    ),
    transports: [new transports.Console()],
  },

  // 生产环境配置
  production: {
    level: 'info',
    format: combine(timestamp(), json(), errors({ stack: true })),
    transports: [
      new transports.Console(),
      // 应用日志 - 所有级别
      createDailyRotateTransport('debug', 'app-%DATE%.log'),
      // 错误日志
      createDailyRotateTransport('error', 'error-%DATE%.log'),
    ],
    exceptionHandlers: [
      createDailyRotateTransport('error', 'exceptions-%DATE%.log'),
    ],
    rejectionHandlers: [
      createDailyRotateTransport('error', 'rejections-%DATE%.log'),
    ],
  },

  // 测试环境配置
  test: {
    level: 'silent',
    transports: [],
  },
};

// 创建 Logger 实例
export function createWinstonLogger(): Logger {
  const env = process.env.NODE_ENV || 'development';
  const config =
    winstonConfig[env as keyof typeof winstonConfig] ||
    winstonConfig.development;

  return createLogger(config);
}
