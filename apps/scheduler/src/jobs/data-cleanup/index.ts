/**
 * 数据清理任务模块
 * 定期清理过期的社交统计分区
 */

export { DATA_CLEANUP_SCHEDULE, DATA_CLEANUP_CONFIG } from "./scheduler.js";
export { processDataCleanupJob } from "./processor.js";
export type { DataCleanupConfig, DataCleanupResult } from "./types.js";
