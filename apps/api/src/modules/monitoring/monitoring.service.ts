import { Injectable, Logger } from '@nestjs/common';
import { db } from '@good-trending/database';
import {
  products,
  trendRanks,
  categories,
  crawlerLogs,
} from '@good-trending/database';
import { count, eq, sql, gte } from 'drizzle-orm';
import {
  SystemStatsResponseDto,
  DatabaseStatsDto,
  SourceStatsDto,
  TrendStatsDto,
  CrawlerStatsDto,
} from './dto/stats.dto';

/**
 * 监控服务
 * 提供系统统计信息
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  /**
   * 获取系统统计信息
   *
   * @returns 系统统计响应
   */
  async getSystemStats(): Promise<SystemStatsResponseDto> {
    this.logger.debug('Fetching system stats');

    // 并行获取所有统计数据
    const [databaseStats, sourceStats, trendStats] = await Promise.all([
      this.getDatabaseStats(),
      this.getSourceStats(),
      this.getTrendStats(),
    ]);

    // 获取内存使用情况
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      database: databaseStats,
      sources: sourceStats,
      trends: trendStats,
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      },
    };
  }

  /**
   * 获取数据库统计信息
   */
  private async getDatabaseStats(): Promise<DatabaseStatsDto> {
    try {
      // 并行查询各表数量
      const [productResult, trendResult, categoryResult, crawlerLogResult] =
        await Promise.all([
          db.select({ count: count() }).from(products),
          db.select({ count: count() }).from(trendRanks),
          db.select({ count: count() }).from(categories),
          db.select({ count: count() }).from(crawlerLogs),
        ]);

      return {
        productCount: productResult[0]?.count ?? 0,
        trendCount: trendResult[0]?.count ?? 0,
        categoryCount: categoryResult[0]?.count ?? 0,
        crawlerLogCount: crawlerLogResult[0]?.count ?? 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch database stats', error);
      // 返回默认值
      return {
        productCount: 0,
        trendCount: 0,
        categoryCount: 0,
        crawlerLogCount: 0,
      };
    }
  }

  /**
   * 获取来源统计信息
   */
  private async getSourceStats(): Promise<SourceStatsDto> {
    try {
      const [xPlatformResult, amazonResult, redditResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(products)
          .where(eq(products.discoveredFrom, 'X_PLATFORM')),
        db
          .select({ count: count() })
          .from(products)
          .where(eq(products.discoveredFrom, 'AMAZON')),
        db
          .select({ count: count() })
          .from(products)
          .where(eq(products.discoveredFrom, 'REDDIT')),
      ]);

      return {
        xPlatformCount: xPlatformResult[0]?.count ?? 0,
        amazonCount: amazonResult[0]?.count ?? 0,
        redditCount: redditResult[0]?.count ?? 0,
      };
    } catch (error) {
      this.logger.error('Failed to fetch source stats', error);
      return {
        xPlatformCount: 0,
        amazonCount: 0,
        redditCount: 0,
      };
    }
  }

  /**
   * 获取趋势统计信息
   */
  private async getTrendStats(): Promise<TrendStatsDto> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 使用日期字符串比较
      const todayStr = today.toISOString().split('T')[0];
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      const monthAgoStr = monthAgo.toISOString().split('T')[0];

      const [todayCount, weekCount, monthCount, avgScoreResult] =
        await Promise.all([
          // 今日趋势
          db
            .select({ count: count() })
            .from(trendRanks)
            .where(gte(trendRanks.statDate, todayStr)),
          // 本周趋势
          db
            .select({ count: count() })
            .from(trendRanks)
            .where(gte(trendRanks.statDate, weekAgoStr)),
          // 本月趋势
          db
            .select({ count: count() })
            .from(trendRanks)
            .where(gte(trendRanks.statDate, monthAgoStr)),
          // 平均分数
          db
            .select({ avg: sql<number>`AVG(${trendRanks.score})` })
            .from(trendRanks),
        ]);

      return {
        todayCount: todayCount[0]?.count ?? 0,
        weekCount: weekCount[0]?.count ?? 0,
        monthCount: monthCount[0]?.count ?? 0,
        avgScore: Math.round((avgScoreResult[0]?.avg ?? 0) * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to fetch trend stats', error);
      return {
        todayCount: 0,
        weekCount: 0,
        monthCount: 0,
        avgScore: 0,
      };
    }
  }

  /**
   * 获取爬虫状态统计
   */
  async getCrawlerStats(): Promise<CrawlerStatsDto> {
    try {
      const [runningResult, completedResult, failedResult, lastRunResult] =
        await Promise.all([
          db
            .select({ count: count() })
            .from(crawlerLogs)
            .where(eq(crawlerLogs.status, 'RUNNING')),
          db
            .select({ count: count() })
            .from(crawlerLogs)
            .where(eq(crawlerLogs.status, 'COMPLETED')),
          db
            .select({ count: count() })
            .from(crawlerLogs)
            .where(eq(crawlerLogs.status, 'FAILED')),
          db
            .select({ startTime: crawlerLogs.startTime })
            .from(crawlerLogs)
            .orderBy(sql`${crawlerLogs.startTime} DESC`)
            .limit(1),
        ]);

      return {
        running: runningResult[0]?.count ?? 0,
        completed: completedResult[0]?.count ?? 0,
        failed: failedResult[0]?.count ?? 0,
        lastRunTime: lastRunResult[0]?.startTime?.toISOString() ?? null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch crawler stats', error);
      return {
        running: 0,
        completed: 0,
        failed: 0,
        lastRunTime: null,
      };
    }
  }
}
