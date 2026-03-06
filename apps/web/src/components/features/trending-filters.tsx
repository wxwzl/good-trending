"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type TimeFilter = "all" | "today" | "week" | "month";

interface TrendingFiltersProps {
  activeFilter?: TimeFilter;
  onFilterChange?: (filter: TimeFilter) => void;
}

export function TrendingFilters({ activeFilter = "today", onFilterChange }: TrendingFiltersProps) {
  const t = useTranslations("trending.filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFilter = (searchParams.get("period") as TimeFilter) || activeFilter;

  const filters: { value: TimeFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "today", label: t("today") },
    { value: "week", label: t("thisWeek") },
    { value: "month", label: t("thisMonth") },
  ];

  const handleFilterChange = (filter: TimeFilter) => {
    if (onFilterChange) {
      onFilterChange(filter);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      if (filter === "all" || filter === "today") {
        params.delete("period");
      } else {
        params.set("period", filter);
      }
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={currentFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
