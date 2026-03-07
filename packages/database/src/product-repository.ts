/**
 * 商品数据访问层
 * 提供统一的商品入库、查询、slug生成等功能
 * 被 API、爬虫、调度器共享使用
 */
import { eq, inArray, type InferSelectModel } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "./client";
import { products, productTopics } from "./schema";

/** 商品类型 */
export type Product = InferSelectModel<typeof products>;

/**
 * 商品数据来源类型
 */
export type SourceType = "X_PLATFORM" | "AMAZON";

/**
 * 商品创建输入
 */
export interface CreateProductInput {
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number | null;
  currency?: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: SourceType;
  /** 可选的自定义 slug */
  slug?: string;
  /** 可选的分类 slug 列表 */
  topics?: string[];
}

/**
 * 商品批量创建结果
 */
export interface BatchCreateResult {
  /** 成功保存的商品数量 */
  savedCount: number;
  /** 跳过的商品数量（已存在） */
  skippedCount: number;
  /** 失败的商品数量 */
  failedCount: number;
  /** 错误信息列表 */
  errors: Array<{ sourceId: string; error: string }>;
}

/**
 * 生成分类ID映射
 * 确保分类存在，返回 slug -> id 的映射
 */
async function ensureTopics(topicSlugs: string[]): Promise<Map<string, string>> {
  const { topics } = await import("./schema");
  const topicMap = new Map<string, string>();

  for (const slug of topicSlugs) {
    const existing = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      topicMap.set(slug, existing[0].id);
    } else {
      // 创建新分类
      const topicId = createId();
      const name = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      try {
        await db.insert(topics).values({
          id: topicId,
          name,
          slug,
          description: `Auto-created topic for ${slug}`,
        });
        topicMap.set(slug, topicId);
      } catch (_error) {
        // 忽略创建失败（可能并发创建）
        const retry = await db
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.slug, slug))
          .limit(1);
        if (retry.length > 0) {
          topicMap.set(slug, retry[0].id);
        }
      }
    }
  }

  return topicMap;
}

/**
 * 生成 URL 友好的 slug
 * 支持 Unicode 字符（包括中文）
 */
export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      // 将空格和特殊字符替换为 -
      .replace(/[\s\p{P}\p{S}]+/gu, "-")
      // 移除连续的 -
      .replace(/-+/g, "-")
      // 移除开头和结尾的 -
      .replace(/^-|-$/g, "")
      .substring(0, 100)
  );
}

/**
 * 生成唯一的 slug
 * 如果 slug 已存在，则添加数字后缀
 * 如果 maxAttempts 次都失败，使用 productId 作为 fallback
 */
export async function generateUniqueSlug(
  name: string,
  productId: string,
  maxAttempts: number = 100
): Promise<string> {
  const baseSlug = generateSlug(name);

  // 首先尝试基础 slug
  const existing = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.slug, baseSlug))
    .limit(1);

  if (existing.length === 0) {
    return baseSlug;
  }

  // 基础 slug 冲突，添加数字后缀
  for (let i = 2; i <= maxAttempts; i++) {
    const suffix = `-${i}`;
    // 预留后缀空间，避免超过 100 字符
    const slugWithSuffix = baseSlug.substring(0, 100 - suffix.length) + suffix;

    const check = await db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.slug, slugWithSuffix))
      .limit(1);

    if (check.length === 0) {
      return slugWithSuffix;
    }
  }

  // 所有尝试都失败，使用 productId 前 8 字符作为 fallback
  const idSuffix = `-${productId.substring(0, 8)}`;
  return baseSlug.substring(0, 100 - idSuffix.length) + idSuffix;
}

/**
 * 检查商品是否已存在（基于 sourceId）
 */
export async function checkProductExists(sourceId: string): Promise<boolean> {
  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sourceId, sourceId))
    .limit(1);

  return existing.length > 0;
}

/**
 * 创建单个商品
 * 如果 sourceId 已存在，则跳过
 *
 * @param input 商品输入数据
 * @returns 创建的商品，如果已存在则返回 null
 */
export async function createProduct(input: CreateProductInput): Promise<Product | null> {
  // 检查是否已存在
  const exists = await checkProductExists(input.sourceId);
  if (exists) {
    return null;
  }

  // 生成 productId
  const productId = createId();

  // 生成唯一 slug
  const slug = input.slug || (await generateUniqueSlug(input.name, productId));

  // 插入商品
  const result = await db
    .insert(products)
    .values({
      id: productId,
      name: input.name,
      slug,
      description: input.description,
      image: input.image,
      price: input.price?.toString() ?? null,
      currency: input.currency ?? "USD",
      sourceUrl: input.sourceUrl,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
    })
    .returning();

  const product = result[0];

  // 处理分类关联
  if (input.topics && input.topics.length > 0) {
    const topicMap = await ensureTopics(input.topics);

    for (const [, topicId] of topicMap) {
      try {
        await db.insert(productTopics).values({
          productId,
          topicId,
        });
      } catch {
        // 忽略关联失败
      }
    }
  }

  return product;
}

/**
 * 批量创建商品
 * 自动处理 sourceId 去重、slug 生成、分类关联
 *
 * @param inputs 商品输入数据列表
 * @returns 批量创建结果
 */
export async function createProductsBatch(
  inputs: CreateProductInput[]
): Promise<BatchCreateResult> {
  const result: BatchCreateResult = {
    savedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const input of inputs) {
    try {
      const product = await createProduct(input);

      if (product) {
        result.savedCount++;
      } else {
        result.skippedCount++;
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push({
        sourceId: input.sourceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * 根据 sourceId 列表批量检查商品是否存在
 * 用于批量导入前快速去重
 *
 * @param sourceIds sourceId 列表
 * @returns 已存在的 sourceId 集合
 */
export async function getExistingSourceIds(sourceIds: string[]): Promise<Set<string>> {
  if (sourceIds.length === 0) {
    return new Set();
  }

  // 分批查询避免 SQL 参数过多
  const batchSize = 1000;
  const existing = new Set<string>();

  for (let i = 0; i < sourceIds.length; i += batchSize) {
    const batch = sourceIds.slice(i, i + batchSize);
    const rows = await db
      .select({ sourceId: products.sourceId })
      .from(products)
      .where(inArray(products.sourceId, batch));

    for (const row of rows) {
      existing.add(row.sourceId);
    }
  }

  return existing;
}

/**
 * 根据 sourceId 查询商品
 */
export async function findProductBySourceId(sourceId: string): Promise<Product | null> {
  const result = await db.select().from(products).where(eq(products.sourceId, sourceId)).limit(1);

  return result[0] ?? null;
}

/**
 * 根据 slug 查询商品
 */
export async function findProductBySlug(slug: string): Promise<Product | null> {
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);

  return result[0] ?? null;
}
