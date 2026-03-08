"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TrendingFilters } from "./trending-filters";
import { TrendingList } from "./trending-list";
import { listTrending, listTrendingClient } from "@/api/trending";
import type { TrendingItem } from "@/api/types";

type TimeFilter = "all" | "today" | "week" | "month";

const periodMap: Record<string, "daily" | "weekly" | "monthly"> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
};

interface TrendingContainerProps {
  initialItems: TrendingItem[];
  initialPeriod?: string;
  locale: string;
}

export function TrendingContainer({ initialItems, initialPeriod, locale }: TrendingContainerProps) {
  const t = useTranslations();
  const [items, setItems] = useState<TrendingItem[]>(initialItems);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>(
    (initialPeriod as TimeFilter) || "today"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState<TimeFilter | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 初始加载时获取 totalPages
  useEffect(() => {
    const fetchInitialData = async () => {
      const apiPeriod = initialPeriod === "all" ? undefined : periodMap[initialPeriod || "day"];
      const result = await listTrendingClient({
        ...(apiPeriod && { period: apiPeriod }),
        page: 1,
        limit: 10,
      });
      setTotalPages(result.totalPages || 1);
    };
    fetchInitialData();
  }, [initialPeriod]);

  const handleFilterChange = useCallback(
    async (filter: TimeFilter) => {
      console.log("Filter clicked:", filter, "current:", activeFilter);
      if (filter === activeFilter) return;

      setLoadingFilter(filter);
      setIsLoading(true);
      setActiveFilter(filter);

      try {
        // all 时不传 period，让后端返回所有数据
        const apiPeriod =
          filter === "all" ? undefined : filter === "today" ? "daily" : periodMap[filter];

        const result = await listTrendingClient({
          ...(apiPeriod && { period: apiPeriod }),
          page: 1,
          limit: 10,
        });

        setItems(result.items || []);
        setCurrentPage(1);
        setTotalPages(result.totalPages || 1);

        // 更新 URL，但不刷新页面
        const url = new URL(window.location.href);
        if (filter === "today") {
          url.searchParams.delete("period");
        } else {
          url.searchParams.set("period", filter);
        }
        window.history.pushState({}, "", url);
      } catch (error) {
        console.error("Failed to fetch trending data:", error);
      } finally {
        setIsLoading(false);
        setLoadingFilter(null);
      }
    },
    [activeFilter]
  );

  return (
    <>
      {/* Filters */}
      <nav className="mb-8" aria-label="Time period filter">
        <TrendingFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          loadingFilter={loadingFilter}
        />
      </nav>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="mb-8 flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{t("common.loading")}</span>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && (
        <TrendingList
          initialItems={items}
          initialPage={currentPage}
          totalPages={totalPages}
          period={activeFilter === "all" || activeFilter === "today" ? undefined : activeFilter}
          locale={locale}
        />
      )}
    </>
  );
}
