"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ProductCard } from "./product-card";
import { listTrending } from "@/api/trending";
import { useTranslations } from "next-intl";
import { TrendingItem } from "@/api/types";

interface TrendingListProps {
  initialItems: TrendingItem[];
  initialPage: number;
  totalPages: number;
  period?: string;
  locale: string;
}

export function TrendingList({
  initialItems,
  initialPage,
  totalPages,
  period,
  locale,
}: TrendingListProps) {
  const t = useTranslations();
  const [items, setItems] = useState<TrendingItem[]>(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 映射 period 到 API 参数
  const getApiPeriod = useCallback((p?: string): "daily" | "weekly" | "monthly" | undefined => {
    const map: Record<string, "daily" | "weekly" | "monthly"> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
    };
    // 如果 p 为空，返回 undefined（对应 all）
    if (!p) return undefined;
    return map[p] || "daily";
  }, []);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const apiPeriod = getApiPeriod(period);
      const result = await listTrending({
        ...(apiPeriod && { period: apiPeriod }),
        page: nextPage,
        limit: 10,
      });

      if (result.items && result.items.length > 0) {
        setItems((prev) => [...prev, ...result.items]);
        setCurrentPage(nextPage);
        setHasMore(nextPage < result.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more trending items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, hasMore, isLoading, period, getApiPeriod]);

  // 使用 Intersection Observer 监听滚动到底部
  useEffect(() => {
    // 获取 main 滚动容器
    const mainElement = document.querySelector("main");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
        root: mainElement, // 以 main 为滚动容器
      }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  // 当初始数据变化时重置状态
  useEffect(() => {
    setItems(initialItems);
    setCurrentPage(initialPage);
    setHasMore(initialPage < totalPages);
  }, [initialItems, initialPage, totalPages, period]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <li key={`${item.productId}-${item.rank}`}>
            <ProductCard
              product={{
                id: item.productId,
                name: item.productName,
                slug: item.productSlug || item.productId,
                image: item.productImage ?? undefined,
                price: item.productPrice ? parseFloat(item.productPrice) : undefined,
                currency: "USD",
                source: "amazon",
                trendingScore: item.score,
                rank: item.rank,
              }}
            />
          </li>
        ))}
      </ul>

      {/* 加载指示器 */}
      <div ref={loaderRef} className="mt-8 flex justify-center py-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{t("common.loading")}</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-sm text-muted-foreground">{t("common.noMore")}</span>
        )}
      </div>
    </>
  );
}
