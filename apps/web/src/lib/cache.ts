/**
 * 缓存 Server-Only 工具函数
 * 只能在 Server Component 或 Server Action 中使用
 */
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "./cache-tags";

export { CACHE_TAGS };

/**
 * 按需重新验证缓存标签
 * @param tag 缓存标签
 * @param profile 缓存生命周期配置（可选，默认 "default"）
 */
export async function invalidateCache(
  tag: string,
  profile: string | { expire?: number } = "default"
): Promise<void> {
  "use server";
  revalidateTag(tag, profile);
}

/**
 * 重新验证热门数据缓存
 * @param period 可选：指定周期（daily/weekly/monthly）
 */
export async function invalidateTrendingCache(period?: string): Promise<void> {
  "use server";
  if (period) {
    revalidateTag(`${CACHE_TAGS.TRENDING}:${period}`, "trending");
  } else {
    revalidateTag(CACHE_TAGS.TRENDING, "trending");
  }
}

/**
 * 重新验证分类数据缓存
 * @param slug 可选：指定分类标识
 */
export async function invalidateTopicsCache(slug?: string): Promise<void> {
  "use server";
  if (slug) {
    revalidateTag(CACHE_TAGS.TOPIC(slug), "topics");
  }
  revalidateTag(CACHE_TAGS.TOPICS, "topics");
}

/**
 * 重新验证产品数据缓存
 * @param id 可选：指定产品ID
 */
export async function invalidateProductCache(id?: string): Promise<void> {
  "use server";
  if (id) {
    revalidateTag(CACHE_TAGS.PRODUCT(id), "product");
  }
  revalidateTag(CACHE_TAGS.PRODUCTS, "product");
}

/**
 * 使用 updateTag 立即更新缓存（后台重新验证）
 * 与 revalidateTag 不同，updateTag 不会清除缓存，而是触发后台更新
 */
export { updateTag } from "next/cache";

// 导出 revalidateTag 供需要时使用
export { revalidateTag };
