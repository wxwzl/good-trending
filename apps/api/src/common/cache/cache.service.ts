import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 缓存服务
 * 基于 Redis 实现的缓存管理
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // 默认缓存时间（秒）
  private readonly defaultTTL = 3600; // 1小时

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * 连接 Redis
   */
  private async connect(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured, cache service will operate in fallback mode',
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error}`);
      this.isConnected = false;
    }
  }

  /**
   * 断开 Redis 连接
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.logger.log('Redis disconnected');
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      this.logger.debug(`Cache miss (fallback mode): ${key}`);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error(`Cache parse error for key ${key}: Invalid JSON`);
      } else {
        this.logger.error(`Cache get error for key ${key}: ${error}`);
      }
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      this.logger.debug(`Cache set skipped (fallback mode): ${key}`);
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const expireTime = ttl ?? this.defaultTTL;

      await this.client.setex(key, expireTime, serializedValue);
      this.logger.debug(`Cache set: ${key}, TTL: ${expireTime}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error}`);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error}`);
    }
  }

  /**
   * 批量删除缓存（支持通配符）
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.debug(
          `Cache pattern deleted: ${pattern}, count: ${keys.length}`,
        );
      }
    } catch (error) {
      this.logger.error(`Cache pattern delete error for ${pattern}: ${error}`);
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}: ${error}`);
      return false;
    }
  }

  /**
   * 获取缓存 TTL
   */
  async getTTL(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}: ${error}`);
      return -1;
    }
  }

  /**
   * 刷新缓存 TTL
   */
  async refreshTTL(key: string, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const expireTime = ttl ?? this.defaultTTL;
      await this.client.expire(key, expireTime);
    } catch (error) {
      this.logger.error(`Cache refresh TTL error for key ${key}: ${error}`);
    }
  }

  /**
   * 生成缓存键
   */
  static generateKey(...parts: string[]): string {
    return `good-trending:${parts.join(':')}`;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
