"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AppearanceHeatmapProps {
  bitmap7Days: bigint | string;
  bitmap30Days?: bigint | string;
  bitmap60Days?: bigint | string;
  activeDays7?: number;
  activeDays30?: number;
  activityScore?: number;
}

/**
 * 解析Bitmap为布尔数组
 * Bitmap每一位代表一天，1=出现，0=未出现
 */
function parseBitmap(bitmap: bigint | string, days: number): boolean[] {
  const bigIntValue = typeof bitmap === "string" ? BigInt(bitmap) : bitmap;
  const result: boolean[] = [];

  for (let i = 0; i < days; i++) {
    // 从最低位开始检查
    const bit = (bigIntValue >> BigInt(i)) & BigInt(1);
    result.push(bit === BigInt(1));
  }

  return result;
}

/**
 * 计算活跃度评分 (0-5)
 */
function calculateActivityScore(
  activeDays: number,
  totalDays: number
): number {
  const ratio = activeDays / totalDays;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  if (ratio > 0) return 1;
  return 0;
}

export function AppearanceHeatmap({
  bitmap7Days,
  bitmap30Days,
  activeDays7,
  activeDays30,
  activityScore,
}: AppearanceHeatmapProps) {
  const t = useTranslations("stats");

  const weekDays = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];

  // 解析7天数据
  const days7 = parseBitmap(bitmap7Days, 7);
  const days30 = bitmap30Days ? parseBitmap(bitmap30Days, 30) : null;

  // 计算活跃度
  const actualActiveDays7 = activeDays7 ?? days7.filter(Boolean).length;
  const actualActiveDays30 = activeDays30 ?? (days30 ? days30.filter(Boolean).length : 0);
  const score = activityScore ?? calculateActivityScore(actualActiveDays30, 30);

  // 生成30天热力图数据（按周分组）
  const weeks: boolean[][] = [];
  if (days30) {
    for (let i = 0; i < 30; i += 7) {
      weeks.push(days30.slice(i, i + 7));
    }
  }

  return (
    <div className="space-y-4">
      {/* 活跃度评分 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("activityScore")}:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full",
                i < score ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium">{score}/5</span>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-muted-foreground">{t("activeDays7")}</p>
          <p className="text-2xl font-bold">{actualActiveDays7}/7</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-muted-foreground">{t("activeDays30")}</p>
          <p className="text-2xl font-bold">{actualActiveDays30}/30</p>
        </div>
      </div>

      {/* 30天热力图 */}
      {days30 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("last30DaysActivity")}</p>
          <div className="space-y-1">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* 热力图网格 */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((active, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn(
                        "aspect-square rounded-sm",
                        active
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}
                      title={active ? t("appeared") : t("notAppeared")}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* 图例 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span>{t("appeared")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
              <span>{t("notAppeared")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
