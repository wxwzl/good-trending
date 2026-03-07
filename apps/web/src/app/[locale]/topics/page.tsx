import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { TopicCard } from "@/components/features/topic-card";
import { ItemListJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { listTopics } from "@/api/topic";
import type { Topic } from "@/api/types";

async function getTopics(): Promise<Topic[]> {
  try {
    const result = await listTopics();
    return result.items || [];
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    return [];
  }
}

interface TopicsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: TopicsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;

  const title = locale === "zh" ? "浏览分类" : "Browse Topics";
  const description =
    locale === "zh" ? "按分类探索热门商品" : "Explore trending products by category";

  return generatePageMetadata({
    title,
    description,
    path: "/topics",
    locale: currentLocale,
    keywords: locale === "zh" ? ["分类", "类别", "商品"] : ["topics", "categories", "products"],
  });
}

// Enable dynamic rendering for this page
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

export default async function TopicsPage({ params }: TopicsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const topics = await getTopics();

  // Prepare items for ItemList JSON-LD
  const itemListItems = topics.map((topic, index) => ({
    id: topic.slug,
    name: topic.name,
    url: `${baseUrl}/${locale}/topics/${topic.slug}`,
    image: topic.imageUrl,
    position: index + 1,
  }));

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.topics"), url: `${baseUrl}/${locale}/topics` },
  ];

  return (
    <div className="py-8">
      {/* Structured Data */}
      <ItemListJsonLd
        name={t("topics.title")}
        description={t("topics.subtitle")}
        items={itemListItems}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <Container>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{t("topics.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("topics.subtitle")}</p>
        </header>

        {/* Topics Grid */}
        {topics.length > 0 ? (
          <section aria-label="Topics list">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <li key={topic.id}>
                  <TopicCard
                    topic={{
                      slug: topic.slug,
                      name: topic.name,
                      description: topic.description,
                      productCount: topic.productCount || 0,
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t("topics.noResults")}</p>
          </div>
        )}
      </Container>
    </div>
  );
}
