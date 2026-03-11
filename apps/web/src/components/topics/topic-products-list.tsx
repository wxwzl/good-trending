"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ProductCard } from "@/components/features/product-card";
import { getTopicProducts } from "@/api/topic";
import { useTranslations } from "next-intl";
import type { Product } from "@/api/types";

interface TopicProductsListProps {
  initialItems: Product[];
  initialPage: number;
  totalPages: number;
  topicSlug: string;
}

export function TopicProductsList({
  initialItems,
  initialPage,
  totalPages,
  topicSlug,
}: TopicProductsListProps) {
  const t = useTranslations();
  const [items, setItems] = useState<Product[]>(initialItems);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 加载更多数据
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getTopicProducts(topicSlug, {
        page: nextPage,
        limit: 20,
      });

      if (result.items && result.items.length > 0) {
        setItems((prev) => [...prev, ...result.items]);
        setCurrentPage(nextPage);
        setHasMore(nextPage < result.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more topic products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, hasMore, isLoading, topicSlug]);

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
  }, [initialItems, initialPage, totalPages, topicSlug]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                image: product.image,
                price: product.price ? parseFloat(product.price) : undefined,
                currency: product.currency,
                source: product.discoveredFrom === "X_PLATFORM" ? "x_platform" : "amazon",
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
