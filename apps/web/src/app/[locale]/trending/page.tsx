import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/features/product-card";
import { TrendingFilters } from "@/components/features/trending-filters";
import { Button } from "@/components/ui/button";
import { ItemListJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { trendingApi, type TrendingItem } from "@/lib/api";

// 将 URL 参数映射到 API 参数
const periodMap: Record<string, "daily" | "weekly" | "monthly"> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
};

async function getTrendingProducts(period?: string) {
  const apiPeriod = period ? periodMap[period] || "daily" : "daily";
  const result = await trendingApi.list({
    period: apiPeriod,
    limit: 20,
  });

  return {
    data: result.data?.data || [],
    total: result.data?.total || 0,
    page: result.data?.page || 1,
    limit: result.data?.limit || 20,
    totalPages: result.data?.totalPages || 0,
  };
}

interface TrendingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
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

// Enable dynamic rendering for this page
export const dynamic = "force-dynamic";
export const revalidate = 300; // Revalidate every 5 minutes

export default async function TrendingPage({ params, searchParams }: TrendingPageProps) {
  const { locale } = await params;
  const { period } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const trendingData = await getTrendingProducts(period);
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
    url: `${baseUrl}/${locale}/product/${item.productId}`,
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

        {/* Product Grid */}
        {trendingData.data.length > 0 ? (
          <section aria-label="Trending products list">
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trendingData.data.map((item) => (
                <li key={item.productId}>
                  <ProductCard
                    product={{
                      id: item.productId,
                      name: item.productName,
                      slug: item.productId,
                      image: item.productImage ?? undefined,
                      price: item.productPrice ? parseFloat(item.productPrice) : undefined,
                      currency: "USD",
                      source: "amazon",
                      trendingScore: item.score,
                      rank: item.rank,
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t("trending.noResults")}</p>
          </div>
        )}

        {/* Load More */}
        {trendingData.totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <Button variant="outline">{t("actions.loadMore")}</Button>
          </div>
        )}
      </Container>
    </div>
  );
}
