/**
 * 商品发现任务 - 处理器
 * 处理 BullMQ 任务
 */

import type { Job } from "bullmq";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError } from "../../utils/error-handler.js";
import { getAllCategories } from "../../utils/database-queries.js";
import { db, products, productCategories } from "@good-trending/database";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { ProductDiscoveryCrawler } from "./crawler.js";
import { PRODUCT_DISCOVERY_CONFIG } from "./scheduler.js";
import type { ProductDiscoveryConfig, DiscoveredProduct } from "./types.js";
import type { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";

const logger = createSchedulerLogger("product-discovery-processor");

/**
 * 处理商品发现任务
 */
export async function processProductDiscoveryJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();

  logger.info(`处理商品发现任务`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "product-discovery",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  let crawler: ProductDiscoveryCrawler | null = null;

  try {
    // 获取类目
    const categoryList = await getAllCategories();

    if (categoryList.length === 0) {
      logger.warn("未找到类目，跳过任务");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫
    const config: Partial<ProductDiscoveryConfig> = {
      headless: data.headless ?? true,
      maxResultsPerCategory: PRODUCT_DISCOVERY_CONFIG.defaults.maxResultsPerCategory,
      maxProductsPerCategory:
        data.maxProducts ?? PRODUCT_DISCOVERY_CONFIG.defaults.maxProductsPerCategory,
      saveToDb: data.saveToDb ?? true,
    };

    crawler = new ProductDiscoveryCrawler(config);

    // 执行爬取
    const crawlResult = await crawler.crawl(categoryList);

    result.totalProducts = crawlResult.data.length;
    result.errorCount = crawlResult.errors.length;

    // 保存结果到数据库
    if (data.saveToDb !== false && crawlResult.data.length > 0) {
      const savedCount = await saveDiscoveredProducts(crawlResult.data);
      result.savedProducts = savedCount;
    }

    // 记录日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    logger.info(`商品发现任务完成`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedCount: result.savedProducts,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Product discovery");
    throw error;
  } finally {
    if (crawler) {
      await crawler.close().catch((err) => {
        logger.error("关闭爬虫失败", { error: String(err) });
      });
    }
  }
}

/**
 * 保存发现的商品
 */
async function saveDiscoveredProducts(products: DiscoveredProduct[]): Promise<number> {
  let savedCount = 0;

  for (const product of products) {
    try {
      // 检查是否已存在
      const existing = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.amazonId, product.amazonId))
        .limit(1);

      if (existing.length > 0) {
        logger.debug(`商品已存在，跳过: ${product.amazonId}`);
        continue;
      }

      // 生成 slug
      const slug = generateSlug(product.name);
      const uniqueSlug = await generateUniqueSlug(slug);

      // 创建商品
      const productId = createId();
      await db.insert(products).values({
        id: productId,
        name: product.name,
        slug: uniqueSlug,
        description: product.description || null,
        image: product.image || null,
        price: product.price?.toString() || null,
        currency: product.currency,
        amazonId: product.amazonId,
        sourceUrl: product.url,
        discoveredFrom: "REDDIT",
        firstSeenAt: product.firstSeenAt.toISOString().split("T")[0],
      });

      // 创建类目关联
      await db.insert(productCategories).values({
        productId,
        categoryId: product.discoveredFromCategory,
      });

      savedCount++;
      logger.info(`保存商品: ${product.name.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`保存商品失败 ${product.amazonId}: ${error}`);
    }
  }

  logger.info(`保存商品完成: ${savedCount}/${products.length}`);
  return savedCount;
}

/**
 * 生成 slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * 生成唯一的 slug
 */
async function generateUniqueSlug(slug: string): Promise<string> {
  const existing = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existing.length === 0) {
    return slug;
  }

  // 添加随机后缀
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}
