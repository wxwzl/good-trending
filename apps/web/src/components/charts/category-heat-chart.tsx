"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";

interface CategoryHeatData {
  date: string;
  redditCount: number;
  xCount: number;
}

interface CategoryHeatChartProps {
  data: CategoryHeatData[];
  height?: number;
}

export function CategoryHeatChart({
  data,
  height = 250,
}: CategoryHeatChartProps) {
  const t = useTranslations("charts");
  const format = useFormatter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReddit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff4500" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff4500" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorX" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1da1f2" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1da1f2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="currentColor"
            className="text-muted-foreground text-xs"
          />
          <YAxis
            stroke="currentColor"
            className="text-muted-foreground text-xs"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-sm">
                    <p className="text-sm font-medium mb-2">
                      {formatDate(label as string)}
                    </p>
                    {payload.map((entry, index) => (
                      <p
                        key={index}
                        className="text-sm"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {entry.value}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="redditCount"
            name={t("redditMentions")}
            stroke="#ff4500"
            fillOpacity={1}
            fill="url(#colorReddit)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="xCount"
            name={t("xMentions")}
            stroke="#1da1f2"
            fillOpacity={1}
            fill="url(#colorX)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
