import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { generateProductMetadata, baseUrl } from "@/lib/seo";
import { type Locale } from "@/i18n/config";
import {
  getProductBySlug,
  getProductSocialStats,
  getProductAppearanceStats,
  getProductTrendHistory,
} from "@/api/product";
import type { Product } from "@/api/types";
import { CategoryTags } from "@/components/stats/category-tags";
import { ProductStatsSection } from "./_components/product-stats-section";
import { Calendar } from "lucide-react";
import Image from "next/image";

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const result = await getProductBySlug(slug);
    return result || null;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The product you are looking for does not exist.",
    };
  }

  return generateProductMetadata({
    name: product.name,
    description: product.description,
    image: product.image,
    price: product.price,
    currency: product.currency,
    productId: slug,
    locale: locale as Locale,
  });
}

export const revalidate = 3600;

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const currentLocale = locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const [socialStats, appearanceStats, trendHistory] = await Promise.all([
    getProductSocialStats(product.id).catch(() => undefined),
    getProductAppearanceStats(product.id).catch(() => undefined),
    getProductTrendHistory(product.id).catch(() => undefined),
  ]);

  const getSourceLabel = (discoveredFrom: string) => {
    return discoveredFrom === "X_PLATFORM"
      ? t("product.sourceLabels.x_platform")
      : t("product.sourceLabels.amazon");
  };

  const formatFirstSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const breadcrumbItems = [
    { name: t("navigation.home"), url: `${baseUrl}/${locale}` },
    { name: t("navigation.trending"), url: `${baseUrl}/${locale}/trending` },
    { name: product.name, url: `${baseUrl}/${locale}/product/${slug}` },
  ];

  return (
    <div className="py-8">
      <ProductJsonLd
        id={slug}
        name={product.name}
        description={product.description}
        image={product.image}
        price={product.price}
        currency={product.currency}
        sourceType={product.discoveredFrom}
        sourceUrl={product.sourceUrl}
        locale={currentLocale}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <Container>
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                {t("navigation.home")}
              </Link>
            </li>
            <li className="before:content-['/'] before:mx-2">
              <Link href="/trending" className="hover:text-foreground transition-colors">
                {t("navigation.trending")}
              </Link>
            </li>
            <li className="before:content-['/'] before:mx-2">
              <span className="text-foreground" aria-current="page">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <article className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="96"
                  height="96"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground/30"
                  aria-hidden="true"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <Badge variant="secondary" className="w-fit mb-3">
              {getSourceLabel(product.discoveredFrom)}
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{product.name}</h1>

            {product.price && (
              <div className="text-3xl font-bold text-primary mb-6" itemProp="price">
                {product.currency || "$"}
                {parseFloat(product.price).toFixed(2)}
              </div>
            )}

            {product.firstSeenAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                <span>
                  {t("product.firstSeen")}: {formatFirstSeen(product.firstSeenAt)}
                </span>
              </div>
            )}

            {product.categories && product.categories.length > 0 && (
              <CategoryTags categories={product.categories} className="mb-4" />
            )}

            {product.description && (
              <Card className="mb-6">
                <h2 className="text-lg font-semibold mb-2">{t("product.description")}</h2>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </Card>
            )}

            <div className="flex flex-wrap gap-3 mt-auto">
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button size="lg">{t("product.viewOriginal")}</Button>
              </a>
              <Button variant="outline" size="lg">
                {t("actions.share")}
              </Button>
            </div>
          </div>
        </article>

        <section className="mb-12" aria-label={t("product.statsSection")}>
          <h2 className="text-xl font-bold mb-4">{t("product.statistics")}</h2>
          <ProductStatsSection
            socialStats={socialStats}
            appearanceStats={appearanceStats}
            trendHistory={trendHistory}
          />
        </section>
      </Container>
    </div>
  );
}
