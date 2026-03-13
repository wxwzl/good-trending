/**
 * Google 搜索工厂
 * 根据配置创建对应的 Google 搜索实现实例
 */

import { GoogleSearchService } from "../services/google-search-service.js";
import { GoogleSearchCrawler } from "../adapters/crawlee/google/google-search.crawler.js";
import type { IGoogleSearch } from "../domain/interfaces/index.js";
import { getCrawlerConfig, type CrawlerImplementation } from "../config/crawler.config.js";

/**
 * Google 搜索实例类型
 */
export type GoogleSearchInstance = IGoogleSearch;

/**
 * 创建 Google 搜索实例
 * @param implementation 指定实现类型，不指定则使用配置
 * @returns Google 搜索实例
 */
export function createGoogleSearch(implementation?: CrawlerImplementation): GoogleSearchInstance {
  const config = getCrawlerConfig();
  const impl = implementation || config.googleSearch;

  if (impl === "crawlee") {
    return new GoogleSearchCrawler();
  } else {
    // Legacy: 包装现有服务以符合 IGoogleSearch 接口
    return new LegacyGoogleSearchAdapter();
  }
}

/**
 * Legacy Google 搜索适配器
 * 将现有 GoogleSearchService 包装为 IGoogleSearch 接口
 */
class LegacyGoogleSearchAdapter implements IGoogleSearch {
  private service: GoogleSearchService;

  constructor() {
    this.service = new GoogleSearchService({ forceBrowser: true });
  }

  async search(query: string) {
    return this.service.search(query);
  }

  async close() {
    await this.service.close();
  }
}
