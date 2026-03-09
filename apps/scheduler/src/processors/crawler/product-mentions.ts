/**
 * 商品提及统计处理器
 * 处理社交提及统计任务
 */
import { Job } from "bullmq";
import { CrawlerJobData, CrawlerJobResult } from "../../queue/index.js";
import { createSchedulerLogger } from "../../utils/logger.js";
import { handleCrawlerError, safeCloseBrowser } from "../../utils/error-handler.js";
import { importCrawler } from "../../utils/dynamic-imports.js";
import { getProducts, type ProductInfo } from "../../utils/database-queries.js";
import { CRAWLER_CONFIG } from "../../constants/index.js";
import type { CrawlerInstance } from "../../types/index.js";
import type { CrawlerStatus } from "@good-trending/crawler/crawlers/BaseCrawler";

const logger = createSchedulerLogger("product-mentions");

/**
 * 提及结果接口
 */
interface MentionResult {
  periodResults: Record<string, { reddit: number; x: number }>;
}

/**
 * 处理单个商品的提及统计
 */
async function processProductMention(
  product: ProductInfo,
  index: number,
  total: number,
  crawler: CrawlerInstance,
  saveProductSocialStats: (
    productId: string,
    date: Date,
    stats: Record<string, { reddit: number; x: number }>
  ) => Promise<void>
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Processing product [${index + 1}/${total}]: ${product.name}`);

    const date = new Date();
    const mentions = (await crawler.crawlProductMentions(product.name, date)) as MentionResult;

    await saveProductSocialStats(product.id, date, mentions.periodResults);

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Processing product ${product.name} failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * 处理社交提及统计任务
 */
export async function processProductMentionsJob(
  job: Job<CrawlerJobData>
): Promise<CrawlerJobResult> {
  const { data } = job;
  const startTime = new Date();
  let crawler: CrawlerInstance | null = null;

  logger.info(`Processing product mentions job`, {
    jobId: job.id,
    traceId: data.traceId,
    triggeredBy: data.triggeredBy,
  });

  const result: CrawlerJobResult = {
    source: "product-mentions",
    totalProducts: 0,
    savedProducts: 0,
    errorCount: 0,
    duration: 0,
    completedAt: "",
  };

  try {
    const [{ saveProductSocialStats, saveCrawlerLog, GoogleSearchCrawler }, productList] =
      await Promise.all([
        importCrawler(),
        getProducts(data.maxProducts ?? CRAWLER_CONFIG.MENTIONS.DEFAULT_MAX_PRODUCTS),
      ]);

    if (productList.length === 0) {
      logger.warn("No products found, skipping product mentions crawl");
      result.completedAt = new Date().toISOString();
      return result;
    }

    // 创建爬虫实例
    crawler = new GoogleSearchCrawler(
      { headless: data.headless ?? true, timeout: CRAWLER_CONFIG.BROWSER_TIMEOUT },
      {
        serpApiKey: process.env.SERPAPI_KEY,
      }
    ) as unknown as CrawlerInstance;

    let processedCount = 0;

    // 逐个处理商品
    for (const product of productList) {
      const processResult = await processProductMention(
        product,
        processedCount,
        productList.length,
        crawler,
        saveProductSocialStats
      );

      if (processResult.success) {
        result.savedProducts++;
      } else {
        result.errorCount++;
      }

      processedCount++;

      // 每处理一批商品延迟一下
      if (processedCount % CRAWLER_CONFIG.MENTIONS.BATCH_SIZE === 0) {
        await new Promise((resolve) => setTimeout(resolve, CRAWLER_CONFIG.MENTIONS.BATCH_DELAY_MS));
      }
    }

    result.totalProducts = productList.length;

    // 记录爬虫日志
    const endTime = new Date();
    result.duration = endTime.getTime() - startTime.getTime();
    result.completedAt = endTime.toISOString();

    await saveCrawlerLog({
      taskType: "PRODUCT_MENTION",
      sourceType: "REDDIT",
      status: "COMPLETED" as CrawlerStatus,
      startTime,
      endTime,
      duration: result.duration,
      itemsFound: result.totalProducts,
      itemsSaved: result.savedProducts,
      errors:
        result.errorCount > 0 ? [{ message: `${result.errorCount} products failed` }] : undefined,
      metadata: {
        traceId: data.traceId,
        triggeredBy: data.triggeredBy,
        productCount: productList.length,
      },
    });

    logger.info(`Product mentions job completed`, {
      jobId: job.id,
      totalProducts: result.totalProducts,
      savedProducts: result.savedProducts,
      errorCount: result.errorCount,
      duration: result.duration,
    });

    return result;
  } catch (error) {
    handleCrawlerError(job, error, result, startTime, "Product mentions");
    throw error;
  } finally {
    await safeCloseBrowser(crawler);
  }
}
