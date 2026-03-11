"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialStatsData {
  today: { reddit: number; x: number };
  yesterday: { reddit: number; x: number };
  thisWeek: { reddit: number; x: number };
  thisMonth: { reddit: number; x: number };
}

interface SocialStatsCardProps {
  data: SocialStatsData;
}

interface StatItemProps {
  label: string;
  redditValue: number;
  xValue: number;
  previousRedditValue?: number;
  previousXValue?: number;
}

function StatItem({
  label,
  redditValue,
  xValue,
  previousRedditValue,
  previousXValue,
}: StatItemProps) {
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const redditChange = calculateChange(redditValue, previousRedditValue);
  const xChange = calculateChange(xValue, previousXValue);

  const renderChange = (change: number | null) => {
    if (change === null) return null;

    const isPositive = change > 0;
    const isNeutral = change === 0;

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs",
          isPositive && "text-green-600 dark:text-green-400",
          !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
          isNeutral && "text-muted-foreground"
        )}
      >
        {isPositive && <TrendingUp className="h-3 w-3" />}
        {!isPositive && !isNeutral && <TrendingDown className="h-3 w-3" />}
        {isNeutral && <Minus className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground mb-3">{label}</p>
      <div className="space-y-2">
        {/* Reddit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff4500]" />
            <span className="text-xs text-muted-foreground">Reddit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{redditValue.toLocaleString()}</span>
            {renderChange(redditChange)}
          </div>
        </div>
        {/* X */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1da1f2]" />
            <span className="text-xs text-muted-foreground">X</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{xValue.toLocaleString()}</span>
            {renderChange(xChange)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialStatsCard({ data }: SocialStatsCardProps) {
  const t = useTranslations("stats");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatItem
        label={t("today")}
        redditValue={data.today.reddit}
        xValue={data.today.x}
        previousRedditValue={data.yesterday.reddit}
        previousXValue={data.yesterday.x}
      />
      <StatItem
        label={t("yesterday")}
        redditValue={data.yesterday.reddit}
        xValue={data.yesterday.x}
      />
      <StatItem
        label={t("thisWeek")}
        redditValue={data.thisWeek.reddit}
        xValue={data.thisWeek.x}
      />
      <StatItem
        label={t("thisMonth")}
        redditValue={data.thisMonth.reddit}
        xValue={data.thisMonth.x}
      />
    </div>
  );
}
