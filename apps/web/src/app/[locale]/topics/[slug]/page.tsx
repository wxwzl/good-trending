import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { generatePageMetadata } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import { getTopic, getTopicProducts, listTopics } from "@/api/topic";
import { TopicProductsList } from "@/components/features/topic-products-list";
import type { Topic, Product } from "@/api/types";

interface TopicWithProducts extends Topic {
  products: Product[];
  totalPages: number;
}

async function getTopicBySlug(slug: string): Promise<TopicWithProducts | null> {
  try {
    // Get topic info
    const topic = await getTopic(slug);
    if (!topic) {
      return null;
    }

    // Get products for this topic (first page)
    const productsResult = await getTopicProducts(slug, { page: 1, limit: 20 });
    const products = productsResult.items || [];

    return {
      ...topic,
      products,
      totalPages: productsResult.totalPages,
    };
  } catch (error) {
    console.error("Failed to fetch topic:", error);
    return null;
  }
}

interface TopicPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;

export const revalidate = 300; // Revalidate every 300 seconds

export async function generateStaticParams() {
  const result = await listTopics({ page: 1, limit: 2 });

  return (result.items || []).map((topic: Topic) => ({
    slug: topic.slug,
  }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const currentLocale = locale as Locale;

  try {
    // Fetch topic for metadata
    const topic = await getTopic(slug);

    if (!topic) {
      return {
        title: "Topic Not Found",
        description: "The topic you are looking for does not exist.",
      };
    }

    return generatePageMetadata({
      title: topic.name,
      description: topic.description || `${topic.name} - Browse trending products`,
      path: `/topics/${slug}`,
      locale: currentLocale,
      keywords: [topic.name, "topic", "category", currentLocale === "zh" ? "分类" : "products"],
    });
  } catch (error) {
    console.error("Failed to generate metadata:", error);
    return {
      title: "Topic Not Found",
      description: "The topic you are looking for does not exist.",
    };
  }
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const topic = await getTopicBySlug(slug);

  if (!topic) {
    notFound();
  }

  return (
    <div className="py-8">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                {t("navigation.home")}
              </Link>
            </li>
            <li className="before:content-['/'] before:mx-2">
              <Link href="/topics" className="hover:text-foreground transition-colors">
                {t("navigation.topics")}
              </Link>
            </li>
            <li className="before:content-['/'] before:mx-2">
              <span className="text-foreground" aria-current="page">
                {topic.name}
              </span>
            </li>
          </ol>
        </nav>

        {/* Topic Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{topic.name}</h1>
          {topic.description && <p className="text-muted-foreground mt-2">{topic.description}</p>}
          {topic.productCount !== undefined && (
            <p className="text-sm text-muted-foreground mt-1">
              {t("topics.productCount", { count: topic.productCount })}
            </p>
          )}
        </header>

        {/* Products Grid */}
        {topic.products.length > 0 ? (
          <section aria-label="Products in this topic">
            <TopicProductsList
              initialItems={topic.products}
              initialPage={1}
              totalPages={topic.totalPages}
              topicSlug={slug}
            />
          </section>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">{t("topics.noProducts")}</p>
          </Card>
        )}
      </Container>
    </div>
  );
}
