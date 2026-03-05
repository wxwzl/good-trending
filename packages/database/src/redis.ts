/**
 * Redis connection and utility functions
 */

import Redis from "ioredis";

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get Redis client instance (singleton pattern)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 10000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
    });

    redisClient.on("close", () => {
      console.log("🔴 Redis connection closed");
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("Redis connection closed");
  }
}

/**
 * Cache utilities
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  /**
   * Set cache value
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    await client.del(...keys);
    return keys.length;
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Set TTL on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.expire(key, ttlSeconds);
    return result === 1;
  },

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    const client = getRedisClient();
    return client.ttl(key);
  },
};

/**
 * Rate limiting utilities
 */
export const rateLimit = {
  /**
   * Check and increment rate limit
   * Returns remaining requests, or -1 if limit exceeded
   */
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const client = getRedisClient();
    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return {
      allowed,
      remaining,
      resetAt: Date.now() + ttl * 1000,
    };
  },

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },
};

/**
 * Health check for Redis
 */
export async function redisHealthCheck(): Promise<{
  status: "ok" | "error";
  latency?: number;
  error?: string;
}> {
  try {
    const client = getRedisClient();
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    return {
      status: "ok",
      latency,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export Redis type for type annotations
export type { Redis };
