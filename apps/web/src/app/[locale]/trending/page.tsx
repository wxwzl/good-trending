import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { TrendingContainer } from "./_components/trending-container";
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

// 使用增量静态生成（ISR），每5分钟重新验证
export const revalidate = 300;

// 获取热门数据（API层已缓存）
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

// 产品列表骨架屏
function TrendingListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-full bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

interface TrendingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; page?: string }>;
}

export async function generateMetadata({ params }: TrendingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const t = await getTranslations({ locale: currentLocale, namespace: "metadata" });

  return generatePageMetadata({
    title: t("trending.title"),
    description: t("trending.description"),
    path: "/trending",
    locale: currentLocale,
    keywords: t("trending.keywords").split(","),
  });
}

// 异步获取数据组件
async function TrendingDataFetcher({
  period,
  page,
  locale,
}: {
  period?: string;
  page?: number;
  locale: string;
}) {
  const trendingData = await getTrendingProducts(period, page);

  return (
    <TrendingContainer initialItems={trendingData.data} initialPeriod={period} locale={locale} />
  );
}

export default async function TrendingPage({ params, searchParams }: TrendingPageProps) {
  const { locale } = await params;
  const { period, page } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const currentPage = parseInt(page || "1", 10);
  const lastUpdated = new Date().toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.trending"), url: `${baseUrl}/${locale}/trending` },
  ];

  return (
    <div className="py-8">
      {/* Structured Data */}
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

        {/* Suspense 包裹，支持流式渲染 */}
        <Suspense fallback={<TrendingListSkeleton />}>
          <TrendingDataFetcher period={period} page={currentPage} locale={locale} />
        </Suspense>
      </Container>
    </div>
  );
}
