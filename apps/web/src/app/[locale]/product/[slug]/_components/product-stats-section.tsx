"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Activity, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProductSocialTab } from "./product-social-tab";
import { ProductAppearanceTab } from "./product-appearance-tab";
import { ProductTrendTab } from "./product-trend-tab";
import type {
  ProductSocialStatsResponse,
  ProductAppearanceStatsResponse,
  ProductTrendHistoryResponse,
} from "@/api/types";

type TabType = "social" | "appearance" | "trend";

interface ProductStatsSectionProps {
  socialStats?: ProductSocialStatsResponse;
  appearanceStats?: ProductAppearanceStatsResponse;
  trendHistory?: ProductTrendHistoryResponse;
}

export function ProductStatsSection({
  socialStats,
  appearanceStats,
  trendHistory,
}: ProductStatsSectionProps) {
  const t = useTranslations("product");
  const [activeTab, setActiveTab] = useState<TabType>("social");

  const tabs: { id: TabType; label: string; icon: typeof MessageCircle }[] = [
    { id: "social", label: t("socialMentions"), icon: MessageCircle },
    { id: "appearance", label: t("appearanceActivity"), icon: Activity },
    { id: "trend", label: t("trendHistory"), icon: TrendingUp },
  ];

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
        {activeTab === "social" && <ProductSocialTab socialStats={socialStats} />}
        {activeTab === "appearance" && <ProductAppearanceTab appearanceStats={appearanceStats} />}
        {activeTab === "trend" && <ProductTrendTab trendHistory={trendHistory} />}
      </div>
    </Card>
  );
}
