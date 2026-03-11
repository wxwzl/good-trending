"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";

interface SocialMentionData {
  date: string;
  redditCount: number;
  xCount: number;
}

interface SocialMentionChartProps {
  data: SocialMentionData[];
  height?: number;
}

export function SocialMentionChart({
  data,
  height = 300,
}: SocialMentionChartProps) {
  const t = useTranslations("charts");
  const format = useFormatter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <Legend className="text-sm" />
          <Line
            type="monotone"
            dataKey="redditCount"
            name={t("redditMentions")}
            stroke="#ff4500"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="xCount"
            name={t("xMentions")}
            stroke="#1da1f2"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
