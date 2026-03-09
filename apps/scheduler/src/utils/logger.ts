/**
 * 日志模块
 * 从 @good-trending/shared 导入统一的日志实例
 */
import { createLoggerInstance } from "@good-trending/shared";

/**
 * 创建调度器日志实例
 * @param context - 日志上下文名称
 * @returns 日志实例
 */
export const createSchedulerLogger = (context: string) =>
  createLoggerInstance(`scheduler:${context}`);

/**
 * 默认日志实例
 */
export const logger = createLoggerInstance("scheduler");
