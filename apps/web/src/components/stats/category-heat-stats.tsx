"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryHeatChart } from "@/components/charts/category-heat-chart";

interface CategoryHeatStatsProps {
  redditCount: number;
  xCount: number;
  yesterdayRedditCount?: number;
  yesterdayXCount?: number;
  crawledProductCount?: number;
  trendData?: Array<{
    date: string;
    redditCount: number;
    xCount: number;
  }>;
}

export function CategoryHeatStats({
  redditCount,
  xCount,
  yesterdayRedditCount,
  yesterdayXCount,
  crawledProductCount,
  trendData,
}: CategoryHeatStatsProps) {
  const t = useTranslations("stats");

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const redditChange = calculateChange(redditCount, yesterdayRedditCount);
  const xChange = calculateChange(xCount, yesterdayXCount);

  const renderChange = (change: number | null) => {
    if (change === null) return null;

    const isPositive = change > 0;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-sm font-medium",
          isPositive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("heatStats")}</h3>
        {crawledProductCount !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>
              {t("newProductsToday", { count: crawledProductCount })}
            </span>
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reddit */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[#ff4500]" />
            <span className="text-sm text-muted-foreground">Reddit</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {redditCount.toLocaleString()}
            </span>
            {renderChange(redditChange)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("vsYesterday")}
          </p>
        </div>

        {/* X */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[#1da1f2]" />
            <span className="text-sm text-muted-foreground">X</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {xCount.toLocaleString()}
            </span>
            {renderChange(xChange)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t("vsYesterday")}
          </p>
        </div>
      </div>

      {/* 趋势图 */}
      {trendData && trendData.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t("last7DaysTrend")}
          </h4>
          <CategoryHeatChart data={trendData} height={200} />
        </div>
      )}
    </div>
  );
}
