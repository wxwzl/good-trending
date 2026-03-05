import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/features/product-card";
import { TrendingFilters } from "@/components/features/trending-filters";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface TrendingItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    price?: string;
    currency?: string;
    sourceType: "X_PLATFORM" | "AMAZON";
    sourceUrl: string;
  };
  rank: number;
  score: number;
  mentions: number;
  views: number;
  likes: number;
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
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to fetch trending products:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

export default async function TrendingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
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

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t("trending.title")}</h1>
              <p className="text-muted-foreground mt-1">{t("trending.subtitle")}</p>
            </div>
            <Badge variant="secondary" size="lg">
              {t("trending.lastUpdated", { date: lastUpdated })}
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <TrendingFilters activeFilter={"today"} onFilterChange={() => {}} />
        </div>

        {/* Product Grid */}
        {trendingData.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trendingData.data.map((item) => (
              <ProductCard
                key={item.id}
                product={{
                  id: item.product.id,
                  name: item.product.name,
                  slug: item.product.id,
                  image: item.product.image,
                  price: item.product.price ? parseFloat(item.product.price) : undefined,
                  currency: item.product.currency,
                  source: item.product.sourceType === "X_PLATFORM" ? "x_platform" : "amazon",
                  trendingScore: item.score,
                  rank: item.rank,
                }}
              />
            ))}
          </div>
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
