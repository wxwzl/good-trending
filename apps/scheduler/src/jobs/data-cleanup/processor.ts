/**
 * 数据清理任务 - 处理器
 * 清理过期的社交统计分区
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { DATA_CLEANUP_CONFIG } from "./scheduler.js";
import type { DataCleanupConfig, DataCleanupResult } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";

const logger = createSchedulerLogger("data-cleanup-processor");

/**
 * 处理数据清理任务
 */
export async function processDataCleanupJob(job: Job<CrawlerJobData>): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理数据清理任务`, {
    jobId: job.id,
    traceId: data.traceId,
  });

  const result: CrawlerJobResult = {
    source: "data-cleanup",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    const config: DataCleanupConfig = {
      retentionMonths: DATA_CLEANUP_CONFIG.defaults.retentionMonths,
      targetTable: DATA_CLEANUP_CONFIG.defaults.targetTable,
      dryRun: data.dryRun ?? DATA_CLEANUP_CONFIG.defaults.dryRun,
    };

    // 执行清理
    const cleanupResult = await cleanupOldPartitions(config);

    result.totalProducts = cleanupResult.droppedPartitions.length;
    result.savedProducts = cleanupResult.droppedPartitions.length;
    result.errorCount = cleanupResult.errors.length;

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    if (cleanupResult.droppedPartitions.length > 0) {
      logger.info(`数据清理完成`, {
        jobId: job.id,
        droppedPartitions: cleanupResult.droppedPartitions,
        freedSpaceMb: cleanupResult.freedSpaceMb,
        duration: result.duration,
      });
    } else {
      logger.info(`没有需要清理的分区`, {
        jobId: job.id,
        retentionMonths: config.retentionMonths,
      });
    }

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Data cleanup");
    throw error;
  }
}

/**
 * 清理过期分区
 */
async function cleanupOldPartitions(config: DataCleanupConfig): Promise<DataCleanupResult> {
  const result: DataCleanupResult = {
    success: true,
    droppedPartitions: [],
    freedSpaceMb: 0,
    errors: [],
    duration: 0,
  };

  try {
    const { db } = await import("@good-trending/database");

    // 计算截止日期（3年前）
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - (config.retentionMonths ?? 36));
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    logger.info(`清理${config.retentionMonths}个月前的分区，截止日期: ${cutoffDateStr}`);

    // 查询过期分区
    const partitions = await db.execute<{ partition_name: string; size_mb: number }>(`
      SELECT
        child.relname AS partition_name,
        pg_total_relation_size(child.oid) / 1024 / 1024 AS size_mb
      FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child ON pg_inherits.inhrelid = child.oid
      WHERE parent.relname = '${config.targetTable}'
      AND pg_get_expr(child.relpartbound, child.oid) ~ 'FOR VALUES FROM \\(''([0-9]{4}-[0-9]{2}-[0-9]{2})''\\) TO'
      AND (regexp_match(pg_get_expr(child.relpartbound, child.oid), 'FOR VALUES FROM \\(''([0-9]{4}-[0-9]{2}-[0-9]{2})''\\) TO'))[1]::DATE < '${cutoffDateStr}'::DATE
      ORDER BY partition_name;
    `);

    if (partitions.rows.length === 0) {
      logger.info(`没有找到早于 ${cutoffDateStr} 的分区`);
      return result;
    }

    logger.info(`发现 ${partitions.rows.length} 个过期分区需要清理`);

    // 删除过期分区
    for (const row of partitions.rows) {
      try {
        if (!config.dryRun) {
          // 实际删除分区
          await db.execute(`DROP TABLE IF EXISTS "${row.partition_name}"`);
          logger.info(`已删除分区: ${row.partition_name} (${row.size_mb} MB)`);
        } else {
          logger.info(`[模拟模式] 将删除分区: ${row.partition_name} (${row.size_mb} MB)`);
        }

        result.droppedPartitions.push(row.partition_name);
        result.freedSpaceMb += Number(row.size_mb);
      } catch (error) {
        const errorMsg = `删除分区 ${row.partition_name} 失败: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    // 创建未来分区（确保下个月的分区存在）
    await createFuturePartitions(db, config.targetTable!);

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
    logger.error(`清理分区失败: ${error}`);
    return result;
  }
}

/**
 * 创建未来分区
 */
async function createFuturePartitions(db: any, tableName: string): Promise<void> {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const year = nextMonth.getFullYear();
  const month = nextMonth.getMonth() + 1; // 0-based to 1-based

  try {
    // 调用 PostgreSQL 函数创建分区
    await db.execute(`
      SELECT create_monthly_partition('${tableName}', ${year}, ${month});
    `);
    logger.info(`已创建未来分区: ${tableName}_${year}_${String(month).padStart(2, "0")}`);
  } catch (error) {
    // 分区可能已存在，忽略错误
    logger.debug(`创建未来分区失败（可能已存在）: ${error}`);
  }
}
