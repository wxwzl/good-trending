import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  db,
  createProduct,
  type SourceType as DbSourceType,
} from '@good-trending/database';
import { products, productCategories } from '@good-trending/database';
import { eq, desc, asc, ilike, and, count } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { SourceType } from './dto/get-products.dto';
import {
  ProductQueryOptions,
  ProductCreateInput,
  ProductUpdateInput,
} from './types/product.types';

/**
 * 商品仓库层
 * 负责数据库操作
 *
 * 性能优化说明：
 * 1. 索引使用：
 *    - product_slug_idx: 用于 slug 查询
 *    - product_first_seen_idx: 用于时间排序
 *    - product_source_url_unique: 用于来源 URL 唯一性检查
 *
 * 2. N+1 查询预防：
 *    - findMany 方法使用 Promise.all 并行执行 count 查询
 *    - getProductCategories 应在需要时批量查询
 *
 * 3. 分页优化：
 *    - 使用 limit + offset 实现分页
 *    - 考虑大数据量时使用游标分页
 */
@Injectable()
export class ProductRepository {
  /**
   * 分页查询商品列表
   */
  async findMany(options: ProductQueryOptions) {
    const {
      page = 1,
      limit = 10,
      discoveredFrom,
      keyword,
      sortBy = 'createdAt',
      order = 'desc',
    } = options;

    // 构建查询条件
    const conditions: SQL[] = [];

    if (discoveredFrom) {
      conditions.push(
        eq(
          products.discoveredFrom,
          discoveredFrom as (typeof SourceType)[keyof typeof SourceType],
        ),
      );
    }

    if (keyword) {
      conditions.push(ilike(products.name, `%${keyword}%`));
    }

    // 构建排序
    const sortColumn =
      sortBy === 'price'
        ? products.price
        : sortBy === 'name'
          ? products.name
          : products.createdAt;
    const orderBy = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    // 执行分页查询
    const offset = (page - 1) * limit;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据 ID 查询单个商品
   */
  async findById(id: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * 根据来源 URL 查询商品
   */
  async findBySourceUrl(sourceUrl: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.sourceUrl, sourceUrl))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * 根据 slug 查询商品
   */
  async findBySlug(slug: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * 创建商品
   * 使用共享的数据库模块
   * 如果 amazonId 已存在，抛出 ConflictException
   */
  async create(input: ProductCreateInput) {
    const product = await createProduct({
      name: input.name,
      slug: input.slug,
      description: input.description,
      image: input.image,
      price: input.price ? parseFloat(input.price) : undefined,
      currency: input.currency,
      sourceUrl: input.sourceUrl,
      amazonId: input.amazonId,
      discoveredFrom: input.discoveredFrom as DbSourceType,
    });

    if (product === null) {
      throw new ConflictException(
        `Product with discoveredFrom ${input.discoveredFrom} and amazonId ${input.amazonId} already exists`,
      );
    }

    return product;
  }

  /**
   * 更新商品
   */
  async update(id: string, input: ProductUpdateInput) {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.image !== undefined) updateData.image = input.image;
    if (input.price !== undefined) updateData.price = parseFloat(input.price);
    if (input.currency !== undefined) updateData.currency = input.currency;

    const result = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * 删除商品
   */
  async delete(id: string) {
    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * 检查商品是否存在
   */
  async exists(id: string): Promise<boolean> {
    const result = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 获取商品的分类
   */
  async getProductCategories(productId: string) {
    return db
      .select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, productId));
  }
}
