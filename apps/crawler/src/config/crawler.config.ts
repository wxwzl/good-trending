/**
 * 爬虫实现配置
 * 支持在 Legacy 和 Crawlee 实现间切换
 */

/**
 * 爬虫实现类型
 */
export type CrawlerImplementation = "legacy" | "crawlee";

/**
 * 获取全局爬虫实现配置
 * @returns 当前配置的爬虫实现类型
 */
export function getCrawlerImplementation(): CrawlerImplementation {
  return (process.env.CRAWLER_IMPLEMENTATION as CrawlerImplementation) || "legacy";
}

/**
 * 是否使用 Crawlee 实现
 * @returns true 如果使用 Crawlee，否则 false
 */
export function isCrawleeEnabled(): boolean {
  return getCrawlerImplementation() === "crawlee";
}

/**
 * 爬虫模块配置
 */
export interface CrawlerModuleConfig {
  /** Google 搜索实现 */
  googleSearch: CrawlerImplementation;
  /** Reddit 实现 */
  reddit: CrawlerImplementation;
  /** Amazon 搜索实现 */
  amazonSearch: CrawlerImplementation;
}

/**
 * 获取完整爬虫配置
 * 支持各模块独立配置，如果不配置则使用全局配置
 * @returns 爬虫模块配置
 */
export function getCrawlerConfig(): CrawlerModuleConfig {
  const globalImpl = getCrawlerImplementation();

  return {
    googleSearch:
      (process.env.GOOGLE_SEARCH_IMPLEMENTATION as CrawlerImplementation) ||
      globalImpl,
    reddit:
      (process.env.REDDIT_IMPLEMENTATION as CrawlerImplementation) || globalImpl,
    amazonSearch:
      (process.env.AMAZON_SEARCH_IMPLEMENTATION as CrawlerImplementation) ||
      globalImpl,
  };
}
