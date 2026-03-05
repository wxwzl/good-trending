import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/features/product-card";
import { TopicCard } from "@/components/features/topic-card";
import { SearchBar } from "@/components/features/search-bar";
import { Link } from "@/i18n/routing";

// Placeholder data - will be replaced with API data
const featuredTopics = [
  { slug: "electronics", name: "Electronics", description: "Gadgets & Tech", productCount: 128 },
  { slug: "fashion", name: "Fashion", description: "Style & Apparel", productCount: 95 },
  {
    slug: "home-garden",
    name: "Home & Garden",
    description: "Living essentials",
    productCount: 82,
  },
  { slug: "sports", name: "Sports", description: "Fitness & Outdoor", productCount: 67 },
];

const trendingProducts = [
  {
    id: "1",
    name: "Wireless Bluetooth Earbuds with Noise Cancellation",
    slug: "wireless-bluetooth-earbuds-1",
    price: 79.99,
    currency: "$",
    rating: 4.5,
    reviewCount: 1234,
    source: "amazon" as const,
    trendingScore: 95,
    rank: 1,
  },
  {
    id: "2",
    name: "Smart Watch Fitness Tracker",
    slug: "smart-watch-fitness-tracker-2",
    price: 149.99,
    currency: "$",
    rating: 4.3,
    reviewCount: 856,
    source: "amazon" as const,
    trendingScore: 88,
    rank: 2,
  },
  {
    id: "3",
    name: "Portable Power Bank 20000mAh",
    slug: "portable-power-bank-3",
    price: 39.99,
    currency: "$",
    rating: 4.7,
    reviewCount: 2341,
    source: "x_platform" as const,
    trendingScore: 82,
    rank: 3,
  },
  {
    id: "4",
    name: "Mechanical Gaming Keyboard RGB",
    slug: "mechanical-gaming-keyboard-4",
    price: 89.99,
    currency: "$",
    rating: 4.4,
    reviewCount: 567,
    source: "amazon" as const,
    trendingScore: 78,
    rank: 4,
  },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

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
              <h3 className="mb-2 text-lg font-semibold">{t("trending.source.x_platform")}</h3>
              <p className="text-sm text-muted-foreground">
                Track trending products discussed on X Platform in real-time
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
              <h3 className="mb-2 text-lg font-semibold">{t("trending.source.amazon")}</h3>
              <p className="text-sm text-muted-foreground">
                Discover best-selling products from Amazon updated daily
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
              <h3 className="mb-2 text-lg font-semibold">{t("trending.score")}</h3>
              <p className="text-sm text-muted-foreground">
                Smart ranking algorithm based on mentions, reviews and sentiment
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
              <p className="text-muted-foreground mt-1">Top products right now</p>
            </div>
            <Link href="/trending">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </Container>
      </section>

      {/* Topics Section */}
      <section className="py-16 sm:py-20">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">{t("navigation.topics")}</h2>
              <p className="text-muted-foreground mt-1">Browse by category</p>
            </div>
            <Link href="/topics">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTopics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
