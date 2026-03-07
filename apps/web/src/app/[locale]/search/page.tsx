import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SearchBar } from "@/components/features/search-bar";
import { ProductCard } from "@/components/features/product-card";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { searchProducts } from "@/api/search";
import type { Product } from "@/api/types";

interface SearchResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchSearchResults(query: string, page: number = 1): Promise<SearchResponse> {
  try {
    const result = await searchProducts({ q: query, page });
    return {
      data: result.items || [],
      total: result.total || 0,
      page: result.page || 1,
      limit: result.limit || 10,
      totalPages: result.totalPages || 0,
    };
  } catch (error) {
    console.error("Failed to search products:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { q: query } = await searchParams;
  const currentLocale = locale as Locale;

  const title = query
    ? locale === "zh"
      ? `搜索: ${query}`
      : `Search: ${query}`
    : locale === "zh"
      ? "搜索"
      : "Search";

  const description = query
    ? locale === "zh"
      ? `搜索 "${query}" 相关的热门商品`
      : `Search for "${query}" trending products`
    : locale === "zh"
      ? "搜索热门商品"
      : "Search for trending products";

  return generatePageMetadata({
    title,
    description,
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    locale: currentLocale,
    keywords: query ? [query] : [],
    noIndex: !!query, // Don't index search results pages
  });
}

// Enable dynamic rendering for this page
export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { q: query, page } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const currentPage = parseInt(page || "1", 10);
  const searchResult = query ? await fetchSearchResults(query, currentPage) : null;

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.search"), url: `${baseUrl}/${locale}/search` },
  ];

  return (
    <div className="py-8">
      {/* Structured Data */}
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <Container>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{t("search.title")}</h1>
          <SearchBar className="max-w-2xl" autoFocus />
        </header>

        {/* Results */}
        {query && searchResult ? (
          <>
            {/* Results Count */}
            <p className="text-muted-foreground mb-6">
              {searchResult.total > 0
                ? t("search.results", { count: searchResult.total, query })
                : t("search.noResults", { query })}
            </p>

            {/* Product Grid */}
            {searchResult.data.length > 0 && (
              <section aria-label="Search results">
                <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {searchResult.data.map((product) => (
                    <li key={product.id}>
                      <ProductCard
                        product={{
                          id: product.id,
                          name: product.name,
                          slug: product.id,
                          image: product.image,
                          price: product.price ? parseFloat(product.price) : undefined,
                          currency: product.currency,
                          source: product.sourceType === "X_PLATFORM" ? "x_platform" : "amazon",
                        }}
                        showRank={false}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Pagination */}
            {searchResult.totalPages > 1 && (
              <nav
                className="mt-8 flex justify-center gap-2"
                aria-label="Search results pagination"
              >
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                  aria-disabled={currentPage === 1}
                >
                  {t("pagination.previous")}
                </a>
                <span className="inline-flex h-10 items-center px-4 text-sm text-muted-foreground">
                  {t("pagination.pageInfo", {
                    current: currentPage,
                    total: searchResult.totalPages,
                  })}
                </span>
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
                >
                  {t("pagination.next")}
                </a>
              </nav>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-muted-foreground/50 mb-4"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-muted-foreground">{t("search.emptyPlaceholder")}</p>
          </div>
        )}
      </Container>
    </div>
  );
}
