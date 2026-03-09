/**
 * 动态导入工具
 * 集中管理所有动态导入，避免循环依赖和重复代码
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let crawlerModule: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let databaseModule: any = null;

/**
 * 动态导入爬虫模块
 * 避免在模块加载时初始化 Playwright
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importCrawler(): Promise<any> {
  if (crawlerModule) {
    return crawlerModule;
  }

  const { GoogleSearchCrawler } = await import("@good-trending/crawler/googleSearchCrawler");
  const services = await import("@good-trending/crawler/services");

  crawlerModule = {
    GoogleSearchCrawler,
    saveCategoryHeatStats: services.saveCategoryHeatStats,
    saveCrawledProducts: services.saveCrawledProducts,
    saveProductSocialStats: services.saveProductSocialStats,
    saveCrawlerLog: services.saveCrawlerLog,
  };

  return crawlerModule;
}

/**
 * 动态导入数据库模块
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importDatabase(): Promise<any> {
  if (databaseModule) {
    return databaseModule;
  }

  const db = await import("@good-trending/database");

  databaseModule = {
    db: db.db,
    categories: db.categories,
    products: db.products,
    productSocialStats: db.productSocialStats,
    trendRanks: db.trendRanks,
    getRedisClient: db.getRedisClient,
  };

  return databaseModule;
}

/**
 * 清除模块缓存
 * 用于测试时重置状态
 */
export function clearModuleCache(): void {
  crawlerModule = null;
  databaseModule = null;
}
