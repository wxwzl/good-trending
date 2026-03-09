/**
 * 日志模块
 * 从 @good-trending/shared 导入统一的日志实例
 */
import { createLoggerInstance, logger as sharedLogger } from "@good-trending/shared";

// 为了保持向后兼容，重新导出
export { createLoggerInstance as createSchedulerLogger, sharedLogger as logger };

/**
 * 默认日志实例
 * @deprecated 请直接使用从 @good-trending/shared 导入的 logger
 */
export const logger = createLoggerInstance("scheduler");
