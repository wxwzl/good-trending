import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generatePageMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const t = await getTranslations({ locale: currentLocale, namespace: "metadata" });

  return generatePageMetadata({
    title: t("about.title"),
    description: t("about.description"),
    path: "/about",
    locale: currentLocale,
    keywords: t("about.keywords").split(","),
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // Breadcrumb items for structured data
  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.about"), url: `${baseUrl}/${locale}/about` },
  ];

  const features = [
    {
      icon: (
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
      ),
      title: t("about.features.realTimeDiscovery.title"),
      description: t("about.features.realTimeDiscovery.description"),
    },
    {
      icon: (
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
      ),
      title: t("about.features.smartRanking.title"),
      description: t("about.features.smartRanking.description"),
    },
    {
      icon: (
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
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
      title: t("about.features.topicBrowsing.title"),
      description: t("about.features.topicBrowsing.description"),
    },
    {
      icon: (
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
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      title: t("about.features.multiLanguage.title"),
      description: t("about.features.multiLanguage.description"),
    },
  ];

  return (
    <div className="py-8">
      {/* Structured Data */}
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <Container size="lg">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t("navigation.about")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("siteDescription")}</p>
        </header>

        {/* Features Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12" aria-label="Features">
          {features.map((feature, index) => (
            <Card key={index} variant="outline" padding="lg">
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center"
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>
                <div>
                  <h2 className="font-semibold mb-1">{feature.title}</h2>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </section>

        {/* Contact */}
        <Card variant="outline">
          <h2 className="text-xl font-semibold mb-4">{t("about.contact.title")}</h2>
          <p className="text-muted-foreground">
            {t("about.contact.description", { email: "hello@goodtrending.com" })}{" "}
          </p>
        </Card>
      </Container>
    </div>
  );
}
