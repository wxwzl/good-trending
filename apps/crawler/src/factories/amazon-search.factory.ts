/**
 * Amazon 搜索工厂
 * 根据配置创建对应的 Amazon 搜索实现实例
 */

import { AmazonSearchService } from "../adapters/legacy/amazon/index.js";
import { AmazonCrawler } from "../adapters/crawlee/amazon/amazon.crawler.js";
import type { IAmazonSearch } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";

/**
 * Amazon 搜索实例类型
 */
export type AmazonSearchInstance = IAmazonSearch;

/**
 * 创建 Amazon 搜索实例
 * @param implementation 指定实现类型，不指定则使用配置（默认 legacy）
 */
export function createAmazonSearch(implementation?: CrawlerImplementation): AmazonSearchInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.amazonSearch;

  if (impl === "crawlee") {
    return new AmazonCrawler();
  } else {
    return new AmazonSearchService();
  }
}
