"use client";

import { useTranslations } from "next-intl";
import { AppearanceHeatmap } from "@/components/stats/appearance-heatmap";
import type { ProductAppearanceStatsResponse } from "@/api/types";

interface ProductAppearanceTabProps {
  appearanceStats?: ProductAppearanceStatsResponse;
}

export function ProductAppearanceTab({ appearanceStats }: ProductAppearanceTabProps) {
  const t = useTranslations("product");

  if (!appearanceStats) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {t("noAppearanceStats")}
      </p>
    );
  }

  return (
    <AppearanceHeatmap
      bitmap7Days={appearanceStats.last7DaysBitmap}
      bitmap30Days={appearanceStats.last30DaysBitmap}
      bitmap60Days={appearanceStats.last60DaysBitmap}
      activeDays7={appearanceStats.activeDays7}
      activeDays30={appearanceStats.activeDays30}
      activityScore={appearanceStats.activityScore}
    />
  );
}
