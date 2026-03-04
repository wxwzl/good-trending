import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function TrendingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("trending.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("trending.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          {t("trending.filters.all")}
        </button>
        <button className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">
          {t("trending.filters.today")}
        </button>
        <button className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">
          {t("trending.filters.thisWeek")}
        </button>
        <button className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors">
          {t("trending.filters.thisMonth")}
        </button>
      </div>

      {/* Product Grid - Placeholder */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="group rounded-lg border border-border bg-card overflow-hidden">
            <div className="aspect-square bg-muted animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                <div className="h-4 bg-muted rounded w-12 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="mt-8 flex justify-center">
        <button className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-8 text-sm font-medium hover:bg-accent transition-colors">
          {t("actions.loadMore")}
        </button>
      </div>
    </div>
  );
}
