"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type TimeFilter = "all" | "today" | "week" | "month";

interface TrendingFiltersProps {
  activeFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
}

export function TrendingFilters({ activeFilter, onFilterChange }: TrendingFiltersProps) {
  const t = useTranslations("trending.filters");

  const filters: { value: TimeFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "today", label: t("today") },
    { value: "week", label: t("thisWeek") },
    { value: "month", label: t("thisMonth") },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
