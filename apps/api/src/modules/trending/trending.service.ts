import { Injectable, Logger } from '@nestjs/common';
import { db } from '@good-trending/database';
import {
  trends,
  products,
  topics,
  productTopics,
} from '@good-trending/database';
import { eq, desc, and, gte, lte, count } from 'drizzle-orm';
import {
  GetTrendingDto,
  Period,
  PaginatedTrendingResponseDto,
} from './dto/trending.dto';

/**
 * 趋势服务层
 * 负责热门趋势数据的业务逻辑处理
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  /**
   * 获取热门趋势数据
   *
   * @param query 查询参数
   * @returns 分页趋势列表
   */
  async getTrending(
    query: GetTrendingDto,
  ): Promise<PaginatedTrendingResponseDto> {
    const {
      page = 1,
      limit = 20,
      period = Period.DAILY,
      topicId,
      startDate,
      endDate,
    } = query;

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // 计算日期范围
    const { start, end } = this.getDateRange(period, startDate, endDate);

    this.logger.debug(
      `Fetching trending: page=${safePage}, limit=${safeLimit}, period=${period}, start=${start}, end=${end}`,
    );

    // 构建查询条件
    const conditions = [gte(trends.date, start), lte(trends.date, end)];

    // 如果指定了分类，添加分类筛选
    if (topicId) {
      // 通过 product_topics 表筛选
      const topicProducts = await db
        .select({ productId: productTopics.productId })
        .from(productTopics)
        .where(eq(productTopics.topicId, topicId));

      if (topicProducts.length === 0) {
        return {
          data: [],
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        };
      }

      // 暂时简化处理，实际应该用 IN 子查询
    }

    // 执行分页查询
    const offset = (safePage - 1) * safeLimit;

    // 查询趋势数据，关联商品信息
    const trendData = await db
      .select({
        id: trends.id,
        productId: trends.productId,
        date: trends.date,
        rank: trends.rank,
        score: trends.score,
        mentions: trends.mentions,
        views: trends.views,
        likes: trends.likes,
        productName: products.name,
        productImage: products.image,
        productPrice: products.price,
      })
      .from(trends)
      .innerJoin(products, eq(trends.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(trends.score))
      .limit(safeLimit)
      .offset(offset);

    // 查询总数
    const totalResult = await db
      .select({ count: count() })
      .from(trends)
      .where(and(...conditions));

    const total = totalResult[0]?.count ?? 0;

    return {
      data: trendData.map((item, index) => ({
        rank: item.rank ?? (safePage - 1) * safeLimit + index + 1,
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage ?? undefined,
        productPrice: item.productPrice ?? undefined,
        score: Number(item.score),
        mentions: item.mentions,
        views: item.views,
        likes: item.likes,
        date: item.date,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 获取每日趋势
   */
  async getDailyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: Period.DAILY });
  }

  /**
   * 获取每周趋势
   */
  async getWeeklyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: Period.WEEKLY });
  }

  /**
   * 获取每月趋势
   */
  async getMonthlyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: Period.MONTHLY });
  }

  /**
   * 根据分类获取趋势
   */
  async getTrendingByTopic(topicSlug: string, query: GetTrendingDto) {
    // 查找分类
    const topic = await db
      .select()
      .from(topics)
      .where(eq(topics.slug, topicSlug))
      .limit(1);

    if (!topic[0]) {
      return {
        data: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: 0,
      };
    }

    return this.getTrending({ ...query, topicId: topic[0].id });
  }

  /**
   * 计算日期范围
   */
  private getDateRange(
    period: Period,
    customStart?: string,
    customEnd?: string,
  ): { start: string; end: string } {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }

    switch (period) {
      case Period.DAILY:
        return { start: today, end: today };
      case Period.WEEKLY: {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: weekAgo.toISOString().split('T')[0],
          end: today,
        };
      }
      case Period.MONTHLY: {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start: monthAgo.toISOString().split('T')[0],
          end: today,
        };
      }
      default:
        return { start: today, end: today };
    }
  }
}
