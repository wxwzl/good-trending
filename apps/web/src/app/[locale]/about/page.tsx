import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("navigation.about")}</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-8">{t("siteDescription")}</p>

          <h2 className="text-xl font-semibold mt-8 mb-4">What We Do</h2>
          <p className="text-muted-foreground">
            Good Trending aggregates trending products from multiple sources including X (Twitter)
            and Amazon. Our intelligent ranking algorithm analyzes mentions, reviews, and sentiment
            to surface the most talked-about products.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">How It Works</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>We crawl X Platform for trending product discussions</li>
            <li>We monitor Amazon best-sellers and new releases</li>
            <li>Our algorithm calculates trending scores based on multiple factors</li>
            <li>Products are ranked and updated daily</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">Features</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>Real-time trending product discovery</li>
            <li>Topic-based browsing and filtering</li>
            <li>Multi-source aggregation (X & Amazon)</li>
            <li>Internationalization support (English & Chinese)</li>
            <li>Dark/Light theme support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
