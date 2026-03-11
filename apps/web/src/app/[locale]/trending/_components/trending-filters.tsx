"use client";

import { useTranslations } from "next-intl";

type TimeFilter = "all" | "today" | "week" | "month";

interface TrendingFiltersProps {
  activeFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  loadingFilter?: TimeFilter | null;
}

export function TrendingFilters({
  activeFilter,
  onFilterChange,
  loadingFilter,
}: TrendingFiltersProps) {
  const t = useTranslations();

  const filters: { value: TimeFilter; label: string }[] = [
    { value: "today", label: t("trending.filters.today") },
    { value: "week", label: t("trending.filters.week") },
    { value: "month", label: t("trending.filters.month") },
    { value: "all", label: t("trending.filters.all") },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          disabled={loadingFilter === filter.value}
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeFilter === filter.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          } ${loadingFilter === filter.value ? "opacity-70" : ""}`}
          aria-pressed={activeFilter === filter.value}
        >
          {loadingFilter === filter.value && (
            <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {filter.label}
        </button>
      ))}
    </div>
  );
}
