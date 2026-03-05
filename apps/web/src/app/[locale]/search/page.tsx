import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SearchBar } from "@/components/features/search-bar";
import { ProductCard } from "@/components/features/product-card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceType: "X_PLATFORM" | "AMAZON";
  sourceUrl: string;
}

interface SearchResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function searchProducts(query: string, page: number = 1): Promise<SearchResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&page=${page}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to search products:", error);
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }
}

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { q: query, page } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const currentPage = parseInt(page || "1", 10);
  const searchResult = query ? await searchProducts(query, currentPage) : null;

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{t("search.title")}</h1>
          <SearchBar className="max-w-2xl" autoFocus />
        </div>

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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {searchResult.data.map((product) => (
                  <ProductCard
                    key={product.id}
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
                ))}
              </div>
            )}

            {/* Pagination */}
            {searchResult.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                  aria-disabled={currentPage === 1}
                >
                  Previous
                </a>
                <span className="inline-flex h-10 items-center px-4 text-sm text-muted-foreground">
                  Page {currentPage} of {searchResult.totalPages}
                </span>
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Next
                </a>
              </div>
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
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-muted-foreground">Enter a search term to find products</p>
          </div>
        )}
      </Container>
    </div>
  );
}
