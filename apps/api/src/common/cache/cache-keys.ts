import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * 缓存键前缀
 */
export const CACHE_PREFIX = 'good-trending';

/**
 * 缓存键模板
 */
export const CacheKeys = {
  // 商品相关
  PRODUCT_LIST: (page: number, limit: number, filters: string) =>
    `${CACHE_PREFIX}:products:list:${page}:${limit}:${filters}`,
  PRODUCT_DETAIL: (id: string) => `${CACHE_PREFIX}:products:detail:${id}`,

  // 趋势相关
  TRENDING_LIST: (period: string, page: number, limit: number) =>
    `${CACHE_PREFIX}:trending:${period}:${page}:${limit}`,
  TRENDING_BY_TOPIC: (topicSlug: string, period: string) =>
    `${CACHE_PREFIX}:trending:topic:${topicSlug}:${period}`,

  // 分类相关
  TOPIC_LIST: (page: number, limit: number) =>
    `${CACHE_PREFIX}:topics:list:${page}:${limit}`,
  TOPIC_DETAIL: (slug: string) => `${CACHE_PREFIX}:topics:detail:${slug}`,
  TOPIC_PRODUCTS: (slug: string, page: number, limit: number) =>
    `${CACHE_PREFIX}:topics:${slug}:products:${page}:${limit}`,

  // 搜索相关
  SEARCH_RESULTS: (query: string, page: number, limit: number) =>
    `${CACHE_PREFIX}:search:${query}:${page}:${limit}`,
  SEARCH_SUGGESTIONS: (keyword: string) =>
    `${CACHE_PREFIX}:search:suggestions:${keyword}`,
};

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTLConfig = {
  SHORT: 60, // 1分钟
  MEDIUM: 300, // 5分钟
  LONG: 3600, // 1小时
  DAY: 86400, // 1天
};

/**
 * 缓存管理器
 * 提供缓存键管理和批量操作功能
 */
@Injectable()
export class CacheManager {
  private readonly logger = new Logger(CacheManager.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 清除商品相关缓存
   */
  async clearProductCache(productId?: string): Promise<void> {
    try {
      // 清除商品列表缓存
      await this.cacheService.delPattern(`${CACHE_PREFIX}:products:list:*`);

      // 清除特定商品详情缓存
      if (productId) {
        await this.cacheService.del(CacheKeys.PRODUCT_DETAIL(productId));
      }

      this.logger.log('Product cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear product cache: ${error}`);
    }
  }

  /**
   * 清除趋势相关缓存
   */
  async clearTrendingCache(): Promise<void> {
    try {
      await this.cacheService.delPattern(`${CACHE_PREFIX}:trending:*`);
      this.logger.log('Trending cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear trending cache: ${error}`);
    }
  }

  /**
   * 清除分类相关缓存
   */
  async clearTopicCache(slug?: string): Promise<void> {
    try {
      await this.cacheService.delPattern(`${CACHE_PREFIX}:topics:*`);

      if (slug) {
        await this.cacheService.del(CacheKeys.TOPIC_DETAIL(slug));
        await this.cacheService.delPattern(`${CACHE_PREFIX}:topics:${slug}:*`);
      }

      this.logger.log('Topic cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear topic cache: ${error}`);
    }
  }

  /**
   * 清除搜索相关缓存
   */
  async clearSearchCache(): Promise<void> {
    try {
      await this.cacheService.delPattern(`${CACHE_PREFIX}:search:*`);
      this.logger.log('Search cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear search cache: ${error}`);
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      await this.cacheService.delPattern(`${CACHE_PREFIX}:*`);
      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error(`Failed to clear all cache: ${error}`);
    }
  }
}
