import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/features/product-card";
import { Link } from "@/i18n/routing";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceType: "X_PLATFORM" | "AMAZON";
}

interface TopicWithProducts extends Topic {
  products: Product[];
}

async function getTopicBySlug(slug: string): Promise<TopicWithProducts | null> {
  try {
    // First get topic info - use same fetch pattern as homepage
    const topicsJson = await fetch(`${API_BASE_URL}/topics?limit=100`, {
      next: { revalidate: 3600 },
    })
      .then((res) => res.json())
      .catch(() => ({ data: { data: [] } }));

    // API returns { data: { data: [...], total: number } }
    const topics: Topic[] = topicsJson.data?.data || topicsJson.data || [];

    const topic = topics.find((t) => t.slug === slug);
    if (!topic) {
      return null;
    }

    // Get products for this topic
    const productsJson = await fetch(`${API_BASE_URL}/products?topicId=${topic.id}&limit=20`, {
      next: { revalidate: 3600 },
    })
      .then((res) => res.json())
      .catch(() => ({ data: { data: [] } }));

    const products: Product[] = productsJson.data?.data || productsJson.data || [];

    return {
      ...topic,
      products,
    };
  } catch (error) {
    console.error("Failed to fetch topic:", error);
    return null;
  }
}

interface TopicPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const currentLocale = locale as Locale;

  try {
    // Fetch topic for metadata - use same fetch pattern as homepage
    const topicsJson = await fetch(`${API_BASE_URL}/topics?limit=100`, {
      next: { revalidate: 3600 },
    })
      .then((res) => res.json())
      .catch(() => ({ data: { data: [] } }));

    const topics: Topic[] = topicsJson.data?.data || topicsJson.data || [];
    const topic = topics.find((t) => t.slug === slug);

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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topic.products.map((product) => (
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
                />
              ))}
            </div>
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
