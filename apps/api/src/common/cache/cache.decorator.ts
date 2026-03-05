import { SetMetadata } from '@nestjs/common';

/**
 * 缓存相关元数据键
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * 缓存键装饰器
 * 用于标记方法的缓存键
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * 缓存 TTL 装饰器
 * 用于设置缓存过期时间（秒）
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * 缓存清除键装饰器
 * 用于标记方法执行后需要清除的缓存键
 */
export const CacheClear = (...keys: string[]) =>
  SetMetadata('cache:clear', keys);
