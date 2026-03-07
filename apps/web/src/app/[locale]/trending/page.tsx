import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { TrendingFilters } from "@/components/features/trending-filters";
import { TrendingList } from "@/components/features/trending-list";
import { ItemListJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { listTrending } from "@/api/trending";
import type { TrendingItem } from "@/api/types";

// 将 URL 参数映射到 API 参数
const periodMap: Record<string, "daily" | "weekly" | "monthly"> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
};

async function getTrendingProducts(period?: string, page?: number) {
  const apiPeriod = period ? periodMap[period] || "daily" : "daily";
  const result = await listTrending({
    period: apiPeriod,
    page: page || 1,
    limit: 10,
  });

  return {
    data: result.items || [],
    total: result.total || 0,
    page: result.page || 1,
    limit: result.limit || 10,
    totalPages: result.totalPages || 0,
  };
}

interface TrendingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; page?: string }>;
}

export async function generateMetadata({ params }: TrendingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;

  const title = locale === "zh" ? "热门商品" : "Trending Products";
  const description =
    locale === "zh"
      ? "发现今日 X 平台和亚马逊的热门商品趋势"
      : "Discover the hottest trending products from X Platform and Amazon today";

  return generatePageMetadata({
    title,
    description,
    path: "/trending",
    locale: currentLocale,
    keywords: locale === "zh" ? ["热门", "趋势", "商品"] : ["trending", "hot", "popular"],
  });
}

export default async function TrendingPage({ params, searchParams }: TrendingPageProps) {
  const { locale } = await params;
  const { period, page } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const currentPage = parseInt(page || "1", 10);
  const trendingData = await getTrendingProducts(period, currentPage);
  const lastUpdated = new Date().toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Prepare items for ItemList JSON-LD
  const itemListItems = trendingData.data.map((item, index) => ({
    id: item.productId,
    name: item.productName,
    url: `${baseUrl}/${locale}/product/${item.productSlug || item.productId}`,
    image: item.productImage ?? undefined,
    position: index + 1,
  }));

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.trending"), url: `${baseUrl}/${locale}/trending` },
  ];

  return (
    <div className="py-8">
      {/* Structured Data */}
      <ItemListJsonLd
        name={t("trending.title")}
        description={t("trending.subtitle")}
        items={itemListItems}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <Container>
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t("trending.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("trending.subtitle")}</p>
            </div>
            <Badge variant="secondary" size="lg">
              {t("trending.lastUpdated", { date: lastUpdated })}
            </Badge>
          </div>
        </header>

        {/* Filters */}
        <nav className="mb-8" aria-label="Time period filter">
          <TrendingFilters />
        </nav>

        {/* Product Grid with Infinite Scroll */}
        <TrendingList
          initialItems={trendingData.data}
          initialPage={currentPage}
          totalPages={trendingData.totalPages}
          period={period}
          locale={locale}
        />
      </Container>
    </div>
  );
}
