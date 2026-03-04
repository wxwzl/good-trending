import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Placeholder topics
  const topics = [
    { slug: "electronics", name: "Electronics", count: 128 },
    { slug: "fashion", name: "Fashion", count: 95 },
    { slug: "home-garden", name: "Home & Garden", count: 82 },
    { slug: "sports", name: "Sports", count: 67 },
    { slug: "books", name: "Books", count: 54 },
    { slug: "toys", name: "Toys", count: 43 },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("topics.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("topics.subtitle")}</p>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <Link
            key={topic.slug}
            href={`/topics/${topic.slug}`}
            className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div>
              <h3 className="font-semibold">{topic.name}</h3>
              <p className="text-sm text-muted-foreground">
                {t("topics.productCount", { count: topic.count })}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
