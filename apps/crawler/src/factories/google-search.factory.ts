/**
 * Google 搜索工厂
 * 根据配置创建对应的 Google 搜索实现实例
 */

import { GoogleSearchService } from "../adapters/legacy/google/index.js";
import { GoogleSearchCrawler } from "../adapters/crawlee/google/google-search.crawler.js";
import type { IGoogleSearch } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";

/**
 * Google 搜索实例类型
 */
export type GoogleSearchInstance = IGoogleSearch;

/**
 * 创建 Google 搜索实例
 * @param implementation 指定实现类型，不指定则使用配置（默认 legacy）
 */
export function createGoogleSearch(implementation?: CrawlerImplementation): GoogleSearchInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.googleSearch;

  if (impl === "crawlee") {
    return new GoogleSearchCrawler();
  } else {
    return new GoogleSearchService({ forceBrowser: true });
  }
}
