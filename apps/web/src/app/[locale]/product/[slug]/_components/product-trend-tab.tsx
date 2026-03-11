"use client";

import { useTranslations } from "next-intl";
import { TrendHistoryChart } from "@/components/charts/trend-history-chart";
import type { ProductTrendHistoryResponse } from "@/api/types";

interface ProductTrendTabProps {
  trendHistory?: ProductTrendHistoryResponse;
}

export function ProductTrendTab({ trendHistory }: ProductTrendTabProps) {
  const t = useTranslations("product");

  // 转换趋势历史数据为图表格式
  const trendChartData =
    trendHistory?.history.map((item) => ({
      date: item.date,
      rank: item.rank,
      score: item.score,
      redditMentions: item.redditMentions,
      xMentions: item.xMentions,
    })) || [];

  if (trendChartData.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {t("noTrendHistory")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t("rankTrendDescription")}
      </h4>
      <TrendHistoryChart data={trendChartData} height={350} />
    </div>
  );
}
