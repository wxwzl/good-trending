/**
 * 数据清理任务 - 类型定义
 */

/**
 * 数据清理配置
 */
export interface DataCleanupConfig {
  /** 保留月数（默认36个月=3年） */
  retentionMonths?: number;
  /** 要清理的表名 */
  targetTable?: string;
  /** 是否模拟运行（不实际删除） */
  dryRun?: boolean;
}

/**
 * 清理结果
 */
export interface DataCleanupResult {
  /** 是否成功 */
  success: boolean;
  /** 删除的分区列表 */
  droppedPartitions: string[];
  /** 释放的存储空间（估算，单位MB） */
  freedSpaceMb: number;
  /** 错误信息 */
  errors: string[];
  /** 执行时间（毫秒） */
  duration: number;
}

/**
 * 分区信息
 */
export interface PartitionInfo {
  /** 分区名 */
  partitionName: string;
  /** 分区起始日期 */
  startDate: string;
  /** 分区结束日期 */
  endDate: string;
  /** 分区大小（MB） */
  sizeMb: number;
}
