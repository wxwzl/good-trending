"use client";

import { useTranslations } from "next-intl";
import { SocialMentionChart } from "@/components/charts/social-mention-chart";
import { SocialStatsCard } from "@/components/stats/social-stats-card";
import type { ProductSocialStatsResponse } from "@/api/types";

interface ProductSocialTabProps {
  socialStats?: ProductSocialStatsResponse;
}

export function ProductSocialTab({ socialStats }: ProductSocialTabProps) {
  const t = useTranslations("product");

  // 转换社交统计数据为图表格式
  const socialChartData =
    socialStats?.history.map((item) => ({
      date: item.date,
      redditCount: item.reddit,
      xCount: item.x,
    })) || [];

  if (!socialStats) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {t("noSocialStats")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <SocialStatsCard data={socialStats} />
      {socialChartData.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t("last30DaysTrend")}
          </h4>
          <SocialMentionChart data={socialChartData} height={300} />
        </div>
      )}
    </div>
  );
}
