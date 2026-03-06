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

// API 基础 URL - 服务端渲染时使用容器可访问的地址
const API_BASE_URL =
  process.env.API_URL || // 服务端专用 (host.docker.internal:3015)
  process.env.NEXT_PUBLIC_API_URL || // 客户端
  "http://localhost:3015/api/v1";

// API response structure
interface TrendingItem {
  rank: number;
  productId: string;
  productName: string;
  productImage?: string;
  productPrice?: string;
  productSourceType?: "X_PLATFORM" | "AMAZON";
  score: number;
  mentions?: number;
  views?: number;
  likes?: number;
  date: string;
}

interface TrendingResponse {
  data: TrendingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function getTrendingProducts(period?: string): Promise<TrendingResponse> {
  try {
    const url = `${API_BASE_URL}/trending${period ? `?period=${period}` : ""}`;
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    // API wraps response in { data: {...} }
    return json.data || json;
  } catch (error) {
    console.error("Failed to fetch trending products:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
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
    image: item.productImage,
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
                      image: item.productImage,
                      price: item.productPrice ? parseFloat(item.productPrice) : undefined,
                      source: item.productSourceType === "X_PLATFORM" ? "x_platform" : "amazon",
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
