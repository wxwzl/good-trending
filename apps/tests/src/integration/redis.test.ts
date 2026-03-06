/**
 * Redis Cache Integration Tests
 * Tests real Redis operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Redis from "ioredis";

describe("Redis Cache Integration Tests", () => {
  let redis: Redis;
  const testKeyPrefix = "test:integration:";

  beforeAll(async () => {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });

    // Wait for connection
    await redis.ping();
  });

  afterAll(async () => {
    // Cleanup all test keys
    const keys = await redis.keys(`${testKeyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    await redis.quit();
  });

  beforeEach(async () => {
    // Clean test keys before each test
    const keys = await redis.keys(`${testKeyPrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe("Connection Tests", () => {
    it("should_connect_to_redis", async () => {
      const result = await redis.ping();
      expect(result).toBe("PONG");
    });

    it("should_get_server_info", async () => {
      const info = await redis.info("server");
      expect(info).toContain("redis_version");
    });
  });

  describe("Basic Operations", () => {
    it("should_set_and_get_string", async () => {
      const key = `${testKeyPrefix}string`;
      const value = "test-value";

      await redis.set(key, value);
      const result = await redis.get(key);

      expect(result).toBe(value);
    });

    it("should_set_and_get_json", async () => {
      const key = `${testKeyPrefix}json`;
      const value = { name: "test", count: 123 };

      await redis.set(key, JSON.stringify(value));
      const result = await redis.get(key);

      expect(JSON.parse(result!)).toEqual(value);
    });

    it("should_delete_key", async () => {
      const key = `${testKeyPrefix}delete`;

      await redis.set(key, "to-delete");
      expect(await redis.exists(key)).toBe(1);

      await redis.del(key);
      expect(await redis.exists(key)).toBe(0);
    });

    it("should_return_null_for_nonexistent_key", async () => {
      const result = await redis.get(`${testKeyPrefix}nonexistent`);
      expect(result).toBeNull();
    });
  });

  describe("TTL Operations", () => {
    it("should_set_key_with_expiry", async () => {
      const key = `${testKeyPrefix}ttl`;

      await redis.setex(key, 10, "expires-soon");

      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10);
    });

    it("should_set_expiry_on_existing_key", async () => {
      const key = `${testKeyPrefix}expire`;

      await redis.set(key, "value");
      await redis.expire(key, 30);

      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(30);
    });

    it("should_return_minus1_for_key_without_expiry", async () => {
      const key = `${testKeyPrefix}no-expire`;

      await redis.set(key, "permanent");
      const ttl = await redis.ttl(key);

      expect(ttl).toBe(-1);
    });

    it("should_return_minus2_for_nonexistent_key", async () => {
      const ttl = await redis.ttl(`${testKeyPrefix}nonexistent-ttl`);
      expect(ttl).toBe(-2);
    });
  });

  describe("Increment Operations", () => {
    it("should_increment_counter", async () => {
      const key = `${testKeyPrefix}counter`;

      await redis.set(key, "0");
      const result = await redis.incr(key);

      expect(result).toBe(1);
    });

    it("should_increment_by_value", async () => {
      const key = `${testKeyPrefix}counter-by`;

      await redis.set(key, "10");
      const result = await redis.incrby(key, 5);

      expect(result).toBe(15);
    });

    it("should_decrement_counter", async () => {
      const key = `${testKeyPrefix}decrement`;

      await redis.set(key, "5");
      const result = await redis.decr(key);

      expect(result).toBe(4);
    });
  });

  describe("Hash Operations", () => {
    it("should_set_and_get_hash_fields", async () => {
      const key = `${testKeyPrefix}hash`;

      await redis.hset(key, "field1", "value1", "field2", "value2");

      const fieldValue = await redis.hget(key, "field1");
      expect(fieldValue).toBe("value1");

      const allFields = await redis.hgetall(key);
      expect(allFields).toEqual({
        field1: "value1",
        field2: "value2",
      });
    });

    it("should_delete_hash_field", async () => {
      const key = `${testKeyPrefix}hash-delete`;

      await redis.hset(key, "field1", "value1", "field2", "value2");
      await redis.hdel(key, "field1");

      const result = await redis.hget(key, "field1");
      expect(result).toBeNull();
    });

    it("should_check_hash_field_exists", async () => {
      const key = `${testKeyPrefix}hash-exists`;

      await redis.hset(key, "field1", "value1");

      expect(await redis.hexists(key, "field1")).toBe(1);
      expect(await redis.hexists(key, "field2")).toBe(0);
    });
  });

  describe("Set Operations", () => {
    it("should_add_and_check_members", async () => {
      const key = `${testKeyPrefix}set`;

      await redis.sadd(key, "member1", "member2", "member3");

      expect(await redis.sismember(key, "member1")).toBe(1);
      expect(await redis.sismember(key, "nonexistent")).toBe(0);
    });

    it("should_get_all_members", async () => {
      const key = `${testKeyPrefix}set-members`;

      await redis.sadd(key, "a", "b", "c");

      const members = await redis.smembers(key);
      expect(members.sort()).toEqual(["a", "b", "c"]);
    });

    it("should_remove_member", async () => {
      const key = `${testKeyPrefix}set-remove`;

      await redis.sadd(key, "to-remove");
      await redis.srem(key, "to-remove");

      expect(await redis.sismember(key, "to-remove")).toBe(0);
    });
  });

  describe("Sorted Set Operations", () => {
    it("should_add_members_with_scores", async () => {
      const key = `${testKeyPrefix}zset`;

      await redis.zadd(key, 1, "one", 2, "two", 3, "three");

      const range = await redis.zrange(key, 0, -1);
      expect(range).toEqual(["one", "two", "three"]);
    });

    it("should_get_score_for_member", async () => {
      const key = `${testKeyPrefix}zset-score`;

      await redis.zadd(key, 100, "product1");

      const score = await redis.zscore(key, "product1");
      expect(score).toBe("100");
    });

    it("should_get_rank_of_member", async () => {
      const key = `${testKeyPrefix}zset-rank`;

      await redis.zadd(key, 10, "low", 50, "mid", 100, "high");

      const rank = await redis.zrevrank(key, "high");
      expect(rank).toBe(0); // highest score has rank 0
    });
  });

  describe("Pattern Matching", () => {
    it("should_find_keys_by_pattern", async () => {
      // Create multiple test keys
      await redis.set(`${testKeyPrefix}pattern:1`, "value1");
      await redis.set(`${testKeyPrefix}pattern:2`, "value2");
      await redis.set(`${testKeyPrefix}pattern:3`, "value3");

      const keys = await redis.keys(`${testKeyPrefix}pattern:*`);

      expect(keys.length).toBe(3);
    });

    it("should_delete_keys_by_pattern", async () => {
      // Create keys to delete
      await redis.set(`${testKeyPrefix}bulk:1`, "v1");
      await redis.set(`${testKeyPrefix}bulk:2`, "v2");
      await redis.set(`${testKeyPrefix}bulk:3`, "v3");

      // Get keys to delete
      const keys = await redis.keys(`${testKeyPrefix}bulk:*`);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Verify deletion
      const remaining = await redis.keys(`${testKeyPrefix}bulk:*`);
      expect(remaining.length).toBe(0);
    });
  });

  describe("Cache Hit/Miss Simulation", () => {
    it("should_simulate_cache_hit", async () => {
      const cacheKey = `${testKeyPrefix}cache:product:123`;

      // First request - cache miss, set value
      let cached = await redis.get(cacheKey);
      expect(cached).toBeNull(); // Cache miss

      // Set cache
      const productData = { id: "123", name: "Test Product" };
      await redis.set(cacheKey, JSON.stringify(productData), "EX", 60);

      // Second request - cache hit
      cached = await redis.get(cacheKey);
      expect(cached).not.toBeNull();
      expect(JSON.parse(cached!)).toEqual(productData);
    });

    it("should_handle_cache_invalidation", async () => {
      const cacheKey = `${testKeyPrefix}cache:invalidate`;

      // Set cache
      await redis.set(cacheKey, "cached-value");

      // Invalidate (delete)
      await redis.del(cacheKey);

      // Verify invalidation
      const result = await redis.get(cacheKey);
      expect(result).toBeNull();
    });

    it("should_handle_cache_warmup", async () => {
      // Simulate warming up cache with trending products
      const trendingKey = `${testKeyPrefix}cache:trending`;

      const trendingData = [
        { rank: 1, productId: "p1", score: 100 },
        { rank: 2, productId: "p2", score: 90 },
        { rank: 3, productId: "p3", score: 80 },
      ];

      await redis.set(trendingKey, JSON.stringify(trendingData), "EX", 300);

      // Verify cache warmup
      const cached = await redis.get(trendingKey);
      expect(JSON.parse(cached!)).toEqual(trendingData);
    });
  });

  describe("Rate Limiting", () => {
    it("should_track_request_count", async () => {
      const rateKey = `${testKeyPrefix}ratelimit:user:123`;

      // Simulate multiple requests
      for (let i = 1; i <= 5; i++) {
        const count = await redis.incr(rateKey);
        expect(count).toBe(i);
      }

      // Clean up
      await redis.del(rateKey);
    });

    it("should_enforce_rate_limit", async () => {
      const rateKey = `${testKeyPrefix}ratelimit:limited`;
      const limit = 3;

      // Set up rate limit
      for (let i = 0; i < limit + 2; i++) {
        const count = await redis.incr(rateKey);

        if (i === 0) {
          // Set expiry on first request
          await redis.expire(rateKey, 60);
        }

        if (i < limit) {
          expect(count).toBeLessThanOrEqual(limit);
        } else {
          expect(count).toBeGreaterThan(limit);
        }
      }

      // Clean up
      await redis.del(rateKey);
    });
  });

  describe("Performance Tests", () => {
    it("should_handle_bulk_operations", async () => {
      const start = Date.now();
      const operations = 100;

      // Bulk set
      const pipeline = redis.pipeline();
      for (let i = 0; i < operations; i++) {
        pipeline.set(`${testKeyPrefix}bulk:${i}`, `value-${i}`);
      }
      await pipeline.exec();

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Cleanup
      const keys = await redis.keys(`${testKeyPrefix}bulk:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    });

    it("should_measure_latency", async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await redis.ping();
        latencies.push(Date.now() - start);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avgLatency).toBeLessThan(10); // Average latency should be under 10ms
    });
  });

  describe("Error Handling", () => {
    it("should_handle_invalid_command_gracefully", async () => {
      await expect(redis.executeCommand("INVALID_COMMAND")).rejects.toThrow();
    });
  });
});
