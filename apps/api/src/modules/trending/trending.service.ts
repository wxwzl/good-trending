import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@good-trending/database';
import {
  trendRanks,
  products,
  categories,
  productCategories,
} from '@good-trending/database';
import { eq, desc, and, gte, lte, count, inArray, sql } from 'drizzle-orm';
import {
  GetTrendingDto,
  PaginatedTrendingResponseDto,
} from './dto/trending.dto';
import { CacheService, CacheKeys, CacheTTLConfig } from '../../common/cache';

/**
 * 趋势服务层
 * 负责热门趋势数据的业务逻辑处理，包含缓存优化
 * 支持多周期趋势计算：日/周/月
 */
@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取热门趋势数据
   * 根据 period 参数查询不同时间范围的数据并聚合
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
      period = 'TODAY',
      categoryId,
      startDate,
      endDate,
    } = query;

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // 计算日期范围
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // 构建缓存键
    const cacheKey = CacheKeys.TRENDING_LIST(
      `${period}:${start}:${end}`,
      safePage,
      safeLimit,
    );

    // 尝试从缓存获取（趋势数据缓存时间较短，1分钟）
    const cached =
      await this.cacheService.get<PaginatedTrendingResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for trending: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(
      `Fetching trending: page=${safePage}, limit=${safeLimit}, period=${period}, start=${start}, end=${end}`,
    );

    // 根据 period 选择不同的查询策略
    let trendData: Array<{
      productId: string;
      productSlug: string;
      productName: string;
      productImage: string | null;
      productPrice: string | null;
      score: number;
      redditMentions: number;
      xMentions: number;
      rank: number;
      statDate: string;
      periodType: string;
    }>;
    let total: number;

    if (period === 'TODAY') {
      // 日趋势：直接查询当天的数据
      const result = await this.getDailyTrendingData(
        safePage,
        safeLimit,
        categoryId,
        end, // 使用 end 日期（今天）
      );
      trendData = result.items;
      total = result.total;
    } else {
      // 周/月趋势：聚合多天数据
      const result = await this.getAggregatedTrendingData(
        safePage,
        safeLimit,
        categoryId,
        start,
        end,
        period,
      );
      trendData = result.items;
      total = result.total;
    }

    const response: PaginatedTrendingResponseDto = {
      items: trendData.map((item, index) => ({
        id: `${item.productId}-${item.statDate}`,
        rank: item.rank ?? (safePage - 1) * safeLimit + index + 1,
        productId: item.productId,
        productSlug: item.productSlug || item.productId,
        productName: item.productName,
        productImage: item.productImage ?? null,
        productPrice: item.productPrice ?? null,
        score: Number(item.score),
        redditMentions: item.redditMentions,
        xMentions: item.xMentions,
        statDate: item.statDate,
        periodType: item.periodType,
      })),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };

    // 缓存结果（趋势数据缓存1分钟，因为实时性要求较高）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.SHORT);

    // 注意：返回的数据会被 TransformInterceptor 包装为 { data: response }
    // 最终格式为 { data: { data: [...], total, page, limit, totalPages } }
    return response;
  }

  /**
   * 获取日趋势数据
   * 直接查询指定日期的趋势数据
   */
  private async getDailyTrendingData(
    page: number,
    limit: number,
    categoryId: string | undefined,
    date: string,
  ): Promise<{
    items: Array<{
      productId: string;
      productSlug: string;
      productName: string;
      productImage: string | null;
      productPrice: string | null;
      score: number;
      redditMentions: number;
      xMentions: number;
      rank: number;
      statDate: string;
      periodType: string;
    }>;
    total: number;
  }> {
    const conditions: (
      | ReturnType<typeof eq>
      | ReturnType<typeof and>
      | ReturnType<typeof inArray>
    )[] = [eq(trendRanks.statDate, date), eq(trendRanks.periodType, 'TODAY')];

    // 如果指定了分类，添加分类筛选
    if (categoryId) {
      const categoryProducts = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, categoryId));

      if (categoryProducts.length === 0) {
        return { items: [], total: 0 };
      }

      const productIds = categoryProducts.map((cp) => cp.productId);
      conditions.push(inArray(trendRanks.productId, productIds));
    }

    const offset = (page - 1) * limit;

    // 查询趋势数据
    const trendData = await db
      .select({
        productId: trendRanks.productId,
        productSlug: products.slug,
        productName: products.name,
        productImage: products.image,
        productPrice: products.price,
        score: trendRanks.score,
        redditMentions: trendRanks.redditMentions,
        xMentions: trendRanks.xMentions,
        rank: trendRanks.rank,
        statDate: trendRanks.statDate,
        periodType: trendRanks.periodType,
      })
      .from(trendRanks)
      .innerJoin(products, eq(trendRanks.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(trendRanks.score))
      .limit(limit)
      .offset(offset);

    // 查询总数
    const totalResult = await db
      .select({ count: count() })
      .from(trendRanks)
      .where(and(...conditions));

    return {
      items: trendData,
      total: totalResult[0]?.count ?? 0,
    };
  }

  /**
   * 获取聚合趋势数据（周/月）
   * 聚合指定日期范围内的趋势数据，计算综合分数
   */
  private async getAggregatedTrendingData(
    page: number,
    limit: number,
    categoryId: string | undefined,
    startDate: string,
    endDate: string,
    period: string,
  ): Promise<{
    items: Array<{
      productId: string;
      productSlug: string;
      productName: string;
      productImage: string | null;
      productPrice: string | null;
      score: number;
      redditMentions: number;
      xMentions: number;
      rank: number;
      statDate: string;
      periodType: string;
    }>;
    total: number;
  }> {
    // 如果指定了分类，先获取该分类下的商品ID
    let categoryProductIds: string[] | undefined;
    if (categoryId) {
      const categoryProducts = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, categoryId));

      if (categoryProducts.length === 0) {
        return { items: [], total: 0 };
      }

      categoryProductIds = categoryProducts.map((cp) => cp.productId);
    }

    // 构建日期范围条件
    const dateConditions = [
      gte(trendRanks.statDate, startDate),
      lte(trendRanks.statDate, endDate),
    ];

    if (categoryProductIds) {
      dateConditions.push(inArray(trendRanks.productId, categoryProductIds));
    }

    // 聚合查询：计算每个商品在日期范围内的综合分数
    // 分数计算方式：
    // - 平均分 * 0.4 + 最高分 * 0.3 + 最新分 * 0.3
    // 这样可以平衡持续热门和近期爆发的商品
    const aggregatedData = await db
      .select({
        productId: trendRanks.productId,
        productSlug: sql<string>`MAX(${products.slug})`.as('product_slug'),
        productName: sql<string>`MAX(${products.name})`.as('product_name'),
        productImage: sql<string | null>`MAX(${products.image})`.as(
          'product_image',
        ),
        productPrice: sql<string | null>`MAX(${products.price})`.as(
          'product_price',
        ),
        // 综合分数计算
        avgScore: sql<number>`AVG(${trendRanks.score})`.as('avg_score'),
        maxScore: sql<number>`MAX(${trendRanks.score})`.as('max_score'),
        latestScore:
          sql<number>`MAX(CASE WHEN ${trendRanks.statDate} = ${endDate} THEN ${trendRanks.score} ELSE 0 END)`.as(
            'latest_score',
          ),
        // 累计指标
        totalRedditMentions: sql<number>`SUM(${trendRanks.redditMentions})`.as(
          'total_reddit_mentions',
        ),
        totalXMentions: sql<number>`SUM(${trendRanks.xMentions})`.as(
          'total_x_mentions',
        ),
        // 数据天数
        dataDays: sql<number>`COUNT(DISTINCT ${trendRanks.statDate})`.as(
          'data_days',
        ),
      })
      .from(trendRanks)
      .innerJoin(products, eq(trendRanks.productId, products.id))
      .where(and(...dateConditions))
      .groupBy(trendRanks.productId);

    // 计算综合分数并排序
    const scoredData = aggregatedData.map((item) => {
      const avgScore = Number(item.avgScore) || 0;
      const maxScore = Number(item.maxScore) || 0;
      const latestScore = Number(item.latestScore) || 0;
      const dataDays = Number(item.dataDays) || 1;

      // 根据周期调整权重
      let score: number;
      if (period === 'THIS_WEEK') {
        // 周趋势：平均分40% + 最高分30% + 最新分30%
        score = avgScore * 0.4 + maxScore * 0.3 + latestScore * 0.3;
      } else {
        // 月趋势：更重视持续性，平均分50% + 最高分25% + 最新分25%
        score = avgScore * 0.5 + maxScore * 0.25 + latestScore * 0.25;
      }

      // 数据完整性惩罚：数据天数越少，分数越低
      const expectedDays = period === 'THIS_WEEK' ? 7 : 30;
      const completenessPenalty = Math.min(dataDays / expectedDays, 1);
      score = score * (0.7 + 0.3 * completenessPenalty);

      // 从 SQL 别名获取 productSlug
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productSlug =
        (item as any).productSlug || (item as any).product_slug;

      return {
        productId: item.productId,
        productSlug: productSlug || item.productId,
        productName: item.productName,
        productImage: item.productImage,
        productPrice: item.productPrice,
        score: Math.round(score * 10) / 10, // 保留一位小数
        redditMentions: Number(item.totalRedditMentions) || 0,
        xMentions: Number(item.totalXMentions) || 0,
        rank: 0, // 稍后计算
        statDate: endDate,
        periodType: period,
      };
    });

    // 按分数排序
    scoredData.sort((a, b) => b.score - a.score);

    // 添加排名
    scoredData.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 分页
    const offset = (page - 1) * limit;
    const paginatedData = scoredData.slice(offset, offset + limit);

    return {
      items: paginatedData,
      total: scoredData.length,
    };
  }

  /**
   * 获取每日趋势
   */
  async getDailyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: 'TODAY' });
  }

  /**
   * 获取每周趋势
   */
  async getWeeklyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: 'THIS_WEEK' });
  }

  /**
   * 获取每月趋势
   */
  async getMonthlyTrending(query: Omit<GetTrendingDto, 'period'>) {
    return this.getTrending({ ...query, period: 'THIS_MONTH' });
  }

  /**
   * 根据分类获取趋势
   */
  async getTrendingByTopic(topicSlug: string, query: GetTrendingDto) {
    // 查找分类
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, topicSlug))
      .limit(1);

    if (!category[0]) {
      throw new NotFoundException(`Topic with slug "${topicSlug}" not found`);
    }

    return this.getTrending({ ...query, categoryId: category[0].id });
  }

  /**
   * 计算日期范围
   */
  private getDateRange(
    period: string,
    customStart?: string,
    customEnd?: string,
  ): { start: string; end: string } {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }

    switch (period) {
      case 'TODAY':
        return { start: today, end: today };
      case 'YESTERDAY': {
        const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0],
        };
      }
      case 'THIS_WEEK':
      case 'LAST_7_DAYS': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: weekAgo.toISOString().split('T')[0],
          end: today,
        };
      }
      case 'THIS_MONTH':
      case 'LAST_30_DAYS': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start: monthAgo.toISOString().split('T')[0],
          end: today,
        };
      }
      case 'LAST_15_DAYS': {
        const days15Ago = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        return {
          start: days15Ago.toISOString().split('T')[0],
          end: today,
        };
      }
      default:
        return { start: today, end: today };
    }
  }
}
