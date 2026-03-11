"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Activity, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SocialMentionChart } from "@/components/charts/social-mention-chart";
import { TrendHistoryChart } from "@/components/charts/trend-history-chart";
import { AppearanceHeatmap } from "@/components/stats/appearance-heatmap";
import { SocialStatsCard } from "@/components/stats/social-stats-card";
import type {
  ProductSocialStatsResponse,
  ProductAppearanceStatsResponse,
  ProductTrendHistoryResponse,
} from "@/api/types";

type TabType = "social" | "appearance" | "trend";

interface StatsSectionProps {
  socialStats?: ProductSocialStatsResponse;
  appearanceStats?: ProductAppearanceStatsResponse;
  trendHistory?: ProductTrendHistoryResponse;
}

export function StatsSection({
  socialStats,
  appearanceStats,
  trendHistory,
}: StatsSectionProps) {
  const t = useTranslations("product");
  const [activeTab, setActiveTab] = useState<TabType>("social");

  const tabs: { id: TabType; label: string; icon: typeof MessageCircle }[] = [
    { id: "social", label: t("socialMentions"), icon: MessageCircle },
    { id: "appearance", label: t("appearanceActivity"), icon: Activity },
    { id: "trend", label: t("trendHistory"), icon: TrendingUp },
  ];

  // 转换社交统计数据为图表格式
  const socialChartData =
    socialStats?.history.map((item) => ({
      date: item.date,
      redditCount: item.reddit,
      xCount: item.x,
    })) || [];

  // 转换趋势历史数据为图表格式
  const trendChartData =
    trendHistory?.history.map((item) => ({
      date: item.date,
      rank: item.rank,
      score: item.score,
      redditMentions: item.redditMentions,
      xMentions: item.xMentions,
    })) || [];

  return (
    <Card className="p-6">
      {/* Tab 导航 */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      <div className="space-y-6">
        {/* 社交提及 Tab */}
        {activeTab === "social" && (
          <div className="space-y-6">
            {socialStats ? (
              <>
                <SocialStatsCard data={socialStats} />
                {socialChartData.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t("last30DaysTrend")}
                    </h4>
                    <SocialMentionChart data={socialChartData} height={300} />
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t("noSocialStats")}
              </p>
            )}
          </div>
        )}

        {/* 出现活跃度 Tab */}
        {activeTab === "appearance" && (
          <div>
            {appearanceStats ? (
              <AppearanceHeatmap
                bitmap7Days={appearanceStats.last7DaysBitmap}
                bitmap30Days={appearanceStats.last30DaysBitmap}
                bitmap60Days={appearanceStats.last60DaysBitmap}
                activeDays7={appearanceStats.activeDays7}
                activeDays30={appearanceStats.activeDays30}
                activityScore={appearanceStats.activityScore}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t("noAppearanceStats")}
              </p>
            )}
          </div>
        )}

        {/* 排名趋势 Tab */}
        {activeTab === "trend" && (
          <div className="space-y-3">
            {trendChartData.length > 0 ? (
              <>
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("rankTrendDescription")}
                </h4>
                <TrendHistoryChart data={trendChartData} height={350} />
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t("noTrendHistory")}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
