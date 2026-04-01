import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { db } from '@good-trending/database';
import {
  categories,
  products,
  productCategories,
  categoryHeatStats,
} from '@good-trending/database';
import { eq, desc, count, inArray, gte, and } from 'drizzle-orm';
import { subDays, format } from 'date-fns';
import { SourceType } from '@good-trending/dto';
import {
  CreateTopicDto,
  UpdateTopicDto,
  GetTopicsDto,
  TopicResponseDto,
  TopicWithProductCountDto,
} from './dto/topic.dto';
import { TopicHeatStatsResponseDto } from './dto/topic-heat-stats.dto';
import { CacheService, CacheKeys, CacheTTLConfig } from '../../common/cache';

/**
 * 分类服务层
 * 负责分类数据的业务逻辑处理
 */
@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取分类列表
   */
  async getTopics(query: GetTopicsDto) {
    const { page = 1, limit = 20 } = query;

    // 参数边界检查
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;

    // 查询分类列表，包含商品数量
    const categoriesData = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        searchKeywords: categories.searchKeywords,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .orderBy(desc(categories.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // 查询总数
    const totalResult = await db.select({ count: count() }).from(categories);
    const total = totalResult[0]?.count ?? 0;

    // 批量获取所有分类的商品数量（避免 N+1 查询）
    const categoryIds = categoriesData.map((category) => category.id);
    const productCounts = await db
      .select({
        categoryId: productCategories.categoryId,
        count: count(),
      })
      .from(productCategories)
      .where(inArray(productCategories.categoryId, categoryIds))
      .groupBy(productCategories.categoryId);

    // 将商品数量映射到分类
    const countMap = new Map(
      productCounts.map((item) => [item.categoryId, item.count]),
    );

    const categoriesWithCount = categoriesData.map((category) => ({
      ...category,
      productCount: countMap.get(category.id) ?? 0,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    }));

    return {
      items: categoriesWithCount,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 根据 slug 获取分类详情
   */
  async getTopicBySlug(slug: string): Promise<TopicWithProductCountDto> {
    // 参数验证
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new NotFoundException('Invalid topic slug');
    }

    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug.trim()))
      .limit(1);

    if (!category[0]) {
      throw new NotFoundException(`Topic with slug ${slug} not found`);
    }

    // 获取商品数量
    const productCountResult = await db
      .select({ count: count() })
      .from(productCategories)
      .where(eq(productCategories.categoryId, category[0].id));

    return {
      ...category[0],
      productCount: productCountResult[0]?.count ?? 0,
      createdAt: category[0].createdAt.toISOString(),
      updatedAt: category[0].updatedAt.toISOString(),
    };
  }

  /**
   * 获取分类下的商品
   */
  async getProductsByTopic(
    slug: string,
    query: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 10 } = query;
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;

    // 查找分类
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (!category[0]) {
      throw new NotFoundException(`Topic with slug ${slug} not found`);
    }

    // 查询商品列表
    const productsData = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        image: products.image,
        price: products.price,
        currency: products.currency,
        sourceUrl: products.sourceUrl,
        amazonId: products.amazonId,
        discoveredFrom: products.discoveredFrom,
        firstSeenAt: products.firstSeenAt,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(
        productCategories,
        eq(products.id, productCategories.productId),
      )
      .where(eq(productCategories.categoryId, category[0].id))
      .orderBy(desc(products.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // 查询总数
    const totalResult = await db
      .select({ count: count() })
      .from(productCategories)
      .where(eq(productCategories.categoryId, category[0].id));

    const total = totalResult[0]?.count ?? 0;

    // 转换日期为字符串
    const items = productsData.map((product) => ({
      ...product,
      discoveredFrom: product.discoveredFrom as SourceType,
      firstSeenAt: String(product.firstSeenAt),
      createdAt: String(product.createdAt),
      updatedAt: String(product.updatedAt),
    }));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * 创建分类
   */
  async createTopic(dto: CreateTopicDto): Promise<TopicResponseDto> {
    // 检查 slug 是否已存在
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, dto.slug))
      .limit(1);

    if (existing[0]) {
      throw new ConflictException(`Topic with slug ${dto.slug} already exists`);
    }

    // 检查名称是否已存在
    const existingName = await db
      .select()
      .from(categories)
      .where(eq(categories.name, dto.name))
      .limit(1);

    if (existingName[0]) {
      throw new ConflictException(`Topic with name ${dto.name} already exists`);
    }

    this.logger.log(`Creating topic: ${dto.name}`);

    const result = await db
      .insert(categories)
      .values({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        searchKeywords: dto.searchKeywords,
      })
      .returning();

    return {
      ...result[0],
      productCount: 0,
      createdAt: result[0].createdAt.toISOString(),
      updatedAt: result[0].updatedAt.toISOString(),
    };
  }

  /**
   * 更新分类
   */
  async updateTopic(
    slug: string,
    dto: UpdateTopicDto,
  ): Promise<TopicResponseDto> {
    // 查找分类
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (!category[0]) {
      throw new NotFoundException(`Topic with slug ${slug} not found`);
    }

    // 更新数据
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;
    if (dto.searchKeywords !== undefined)
      updateData.searchKeywords = dto.searchKeywords;

    // 执行更新（不手动设置 updatedAt，让数据库默认值处理）
    await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, category[0].id));

    // 查询更新后的数据
    const updatedCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, category[0].id))
      .limit(1);

    if (!updatedCategory[0]) {
      throw new NotFoundException(
        `Topic with slug ${slug} not found after update`,
      );
    }

    // 获取商品数量
    const productCountResult = await db
      .select({ count: count() })
      .from(productCategories)
      .where(eq(productCategories.categoryId, updatedCategory[0].id));

    return {
      ...updatedCategory[0],
      productCount: productCountResult[0]?.count ?? 0,
      createdAt: updatedCategory[0].createdAt.toISOString(),
      updatedAt: updatedCategory[0].updatedAt.toISOString(),
    };
  }

  /**
   * 获取分类热度统计
   * 使用缓存优化频繁查询
   */
  async getTopicHeatStats(slug: string): Promise<TopicHeatStatsResponseDto> {
    // 参数验证
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new NotFoundException('Invalid topic slug');
    }

    const trimmedSlug = slug.trim();
    const cacheKey = CacheKeys.TOPIC_HEAT_STATS(trimmedSlug);

    // 尝试从缓存获取
    const cached =
      await this.cacheService.get<TopicHeatStatsResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for topic heat stats: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Fetching topic heat stats: ${trimmedSlug}`);

    // 查找分类
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, trimmedSlug))
      .limit(1);

    if (!category[0]) {
      throw new NotFoundException(`Topic with slug ${slug} not found`);
    }

    const categoryId = category[0].id;

    // 获取最新热度统计
    const latestStats = await db
      .select()
      .from(categoryHeatStats)
      .where(eq(categoryHeatStats.categoryId, categoryId))
      .orderBy(desc(categoryHeatStats.statDate))
      .limit(1);

    const stats = latestStats[0];

    // 获取近7天趋势数据
    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const trendData = await db
      .select({
        statDate: categoryHeatStats.statDate,
        redditResultCount: categoryHeatStats.redditResultCount,
        xResultCount: categoryHeatStats.xResultCount,
      })
      .from(categoryHeatStats)
      .where(
        and(
          eq(categoryHeatStats.categoryId, categoryId),
          gte(categoryHeatStats.statDate, sevenDaysAgo),
        ),
      )
      .orderBy(desc(categoryHeatStats.statDate))
      .limit(7);

    const response: TopicHeatStatsResponseDto = {
      today: {
        reddit: stats?.redditResultCount ?? 0,
        x: stats?.xResultCount ?? 0,
      },
      yesterday: {
        reddit: stats?.yesterdayRedditCount ?? 0,
        x: stats?.yesterdayXCount ?? 0,
      },
      last7Days: {
        reddit: stats?.last7DaysRedditCount ?? 0,
        x: stats?.last7DaysXCount ?? 0,
      },
      crawledProducts: stats?.crawledProductCount ?? 0,
      trend: trendData
        .map((item) => ({
          date: this.formatDate(item.statDate),
          reddit: item.redditResultCount,
          x: item.xResultCount,
        }))
        .reverse(),
    };

    // 缓存结果（10分钟）
    await this.cacheService.set(cacheKey, response, CacheTTLConfig.MEDIUM);

    return response;
  }

  /**
   * 格式化日期为字符串
   */
  private formatDate(date: unknown): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return String(date);
  }
}
