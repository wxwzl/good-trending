import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { db } from '@good-trending/database';
import { categories, products, productCategories } from '@good-trending/database';
import { eq, desc, count, inArray } from 'drizzle-orm';
import { SourceType } from '@good-trending/dto';
import {
  CreateTopicDto,
  UpdateTopicDto,
  GetTopicsDto,
  TopicResponseDto,
  TopicWithProductCountDto,
} from './dto/topic.dto';

/**
 * 分类服务层
 * 负责分类数据的业务逻辑处理
 */
@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

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
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(productCategories, eq(products.id, productCategories.productId))
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
      createdAt:
        product.createdAt instanceof Date
          ? product.createdAt.toISOString()
          : product.createdAt,
      updatedAt:
        product.updatedAt instanceof Date
          ? product.updatedAt.toISOString()
          : product.updatedAt,
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
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.imageUrl !== undefined) updateData.imageUrl = dto.imageUrl;

    const result = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, category[0].id))
      .returning();

    // 获取商品数量
    const productCountResult = await db
      .select({ count: count() })
      .from(productCategories)
      .where(eq(productCategories.categoryId, result[0].id));

    return {
      ...result[0],
      productCount: productCountResult[0]?.count ?? 0,
      createdAt: result[0].createdAt.toISOString(),
      updatedAt: result[0].updatedAt.toISOString(),
    };
  }
}
