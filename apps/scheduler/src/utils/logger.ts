/**
 * 日志模块
 * 使用 winston 创建统一的日志实例
 */
import { createLogger, format, transports, Logger } from "winston";

/**
 * 日志级别
 */
type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

/**
 * 获取日志级别
 * 从环境变量读取，默认为 info
 */
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  const validLevels: LogLevel[] = ["error", "warn", "info", "http", "verbose", "debug", "silly"];

  if (level && validLevels.includes(level as LogLevel)) {
    return level as LogLevel;
  }
  return "info";
}

/**
 * 控制台传输格式（带颜色）
 */
const consoleFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    const levelStr = level.toUpperCase().padEnd(5);
    let log = `${timestamp} [${levelStr}] ${message}`;

    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      const metaStr = metaKeys.map((key) => `${key}=${JSON.stringify(metadata[key])}`).join(" ");
      log += ` ${metaStr}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * 创建日志实例
 */
export function createSchedulerLogger(name: string): Logger {
  return createLogger({
    level: getLogLevel(),
    defaultMeta: { service: name },
    transports: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
    exceptionHandlers: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
    rejectionHandlers: [
      new transports.Console({
        format: consoleFormat,
      }),
    ],
  });
}

/**
 * 默认日志实例
 */
export const logger = createSchedulerLogger("scheduler");
