"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";

interface TrendHistoryData {
  date: string;
  rank: number;
  score: number;
  redditMentions: number;
  xMentions: number;
}

interface TrendHistoryChartProps {
  data: TrendHistoryData[];
  height?: number;
}

export function TrendHistoryChart({
  data,
  height = 300,
}: TrendHistoryChartProps) {
  const t = useTranslations("charts");
  const format = useFormatter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format.dateTime(date, { month: "short", day: "numeric" });
  };

  // 反转排名数据，使排名1在上方
  const maxRank = Math.max(...data.map((d) => d.rank), 10);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="currentColor"
            className="text-muted-foreground text-xs"
          />
          <YAxis
            yAxisId="rank"
            orientation="left"
            domain={[maxRank + 1, 1]}
            stroke="currentColor"
            className="text-muted-foreground text-xs"
            label={{
              value: t("rank"),
              angle: -90,
              position: "insideLeft",
              className: "text-muted-foreground text-xs",
            }}
          />
          <YAxis
            yAxisId="score"
            orientation="right"
            domain={[0, 100]}
            stroke="currentColor"
            className="text-muted-foreground text-xs"
            label={{
              value: t("score"),
              angle: 90,
              position: "insideRight",
              className: "text-muted-foreground text-xs",
            }}
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
                        {entry.name === t("score") ? "" : ""}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine
            yAxisId="rank"
            y={10}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: t("top10"),
              position: "right",
              className: "text-xs fill-muted-foreground",
            }}
          />
          <Line
            yAxisId="rank"
            type="monotone"
            dataKey="rank"
            name={t("rank")}
            stroke="#8884d8"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="score"
            name={t("score")}
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
