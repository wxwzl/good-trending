/**
 * Amazon 搜索工厂
 * 根据配置创建对应的 Amazon 搜索实现实例
 */

import { AmazonSearchService } from "../services/amazon-search-service.js";
import { AmazonCrawler } from "../adapters/crawlee/amazon/amazon.crawler.js";
import type { IAmazonSearch } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";

/**
 * Amazon 搜索实例类型
 */
export type AmazonSearchInstance = IAmazonSearch;

/**
 * 创建 Amazon 搜索实例
 * @param implementation 指定实现类型，不指定则使用配置
 * @returns Amazon 搜索实例
 */
export function createAmazonSearch(implementation?: CrawlerImplementation): AmazonSearchInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.amazonSearch;

  if (impl === "crawlee") {
    return new AmazonCrawler();
  } else {
    // Legacy: 包装现有服务以符合 IAmazonSearch 接口
    return new LegacyAmazonSearchAdapter();
  }
}

/**
 * Legacy Amazon 搜索适配器
 * 将现有 AmazonSearchService 包装为 IAmazonSearch 接口
 */
class LegacyAmazonSearchAdapter implements IAmazonSearch {
  private service: AmazonSearchService;

  constructor() {
    this.service = new AmazonSearchService();
  }

  async searchByKeyword(keyword: string) {
    return this.service.searchByKeyword(keyword);
  }

  async extractProductInfoFromUrl(url: string) {
    return this.service.extractProductInfoFromUrl(url);
  }

  async close() {
    await this.service.closeBrowser();
  }
}
