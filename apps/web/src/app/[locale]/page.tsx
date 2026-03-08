import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/features/product-card";
import { TopicCard } from "@/components/features/topic-card";
import { SearchBar } from "@/components/features/search-bar";
import { Link } from "@/i18n/routing";
import { generatePageMetadata } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { listTrending } from "@/api/trending";
import { listTopics } from "@/api/topic";
import type { TrendingItem, Topic } from "@/api/types";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const t = await getTranslations({ locale: currentLocale, namespace: "metadata" });

  return generatePageMetadata({
    title: t("home.title"),
    description: t("home.description"),
    path: "",
    locale: currentLocale,
    keywords: t("home.keywords").split(","),
  });
}

// Enable dynamic rendering for this page
export const dynamic = "force-dynamic";
export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Fetch data from API
  const [trendingResult, topicsResult] = await Promise.all([
    listTrending({ limit: 4 }),
    listTopics({ limit: 4 }),
  ]);

  const trendingProducts = trendingResult.items || [];
  const featuredTopics = topicsResult.items || [];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24 lg:py-32">
        <Container>
          <div className="flex flex-col items-center text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("home.title")}
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              {t("home.subtitle")}
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-xl">
              <SearchBar />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/trending">
                <Button size="lg">{t("home.viewTrending")}</Button>
              </Link>
              <Link href="/topics">
                <Button variant="outline" size="lg">
                  {t("home.browseTopics")}
                </Button>
              </Link>
            </div>
          </div>
        </Container>

        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
            <div
              className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-primary/30 opacity-20"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card variant="outline" padding="lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v4" />
                  <path d="m16.2 7.8 2.9-2.9" />
                  <path d="M18 12h4" />
                  <path d="m16.2 16.2 2.9 2.9" />
                  <path d="M12 18v4" />
                  <path d="m4.9 19.1 2.9-2.9" />
                  <path d="M2 12h4" />
                  <path d="m4.9 4.9 2.9 2.9" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("home.features.xPlatform.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("home.features.xPlatform.description")}
              </p>
            </Card>

            <Card variant="outline" padding="lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("home.features.amazon.title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("home.features.amazon.description")}
              </p>
            </Card>

            <Card variant="outline" padding="lg">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {t("home.features.smartRanking.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("home.features.smartRanking.description")}
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Trending Products Section */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">{t("navigation.trending")}</h2>
              <p className="text-muted-foreground mt-1">{t("home.topProducts")}</p>
            </div>
            <Link href="/trending">
              <Button variant="outline">{t("actions.viewAll")}</Button>
            </Link>
          </div>

          {trendingProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trendingProducts.map((item) => (
                <ProductCard
                  key={item.productId}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">{t("trending.noResults")}</p>
            </div>
          )}
        </Container>
      </section>

      {/* Topics Section */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">{t("navigation.topics")}</h2>
              <p className="text-muted-foreground mt-1">{t("home.browseByCategory")}</p>
            </div>
            <Link href="/topics">
              <Button variant="outline">{t("actions.viewAll")}</Button>
            </Link>
          </div>

          {featuredTopics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={{
                    slug: topic.slug,
                    name: topic.name,
                    description: topic.description,
                    productCount: topic.productCount || 0,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">{t("topics.noResults")}</p>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
