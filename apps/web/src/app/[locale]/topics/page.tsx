import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { TopicCard } from "@/components/features/topic-card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

async function getTopics(): Promise<Topic[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/topics`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to fetch topics:", error);
    return [];
  }
}

export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const topics = await getTopics();

  return (
    <div className="py-8">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("topics.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("topics.subtitle")}</p>
        </div>

        {/* Topics Grid */}
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
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
            <p className="text-muted-foreground">No topics found</p>
          </div>
        )}
      </Container>
    </div>
  );
}
