import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005/api/v1";

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: "X_PLATFORM" | "AMAZON";
  createdAt: string;
  updatedAt: string;
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      type: "product",
      images: product.image ? [product.image] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const sourceLabels = {
    X_PLATFORM: "X Platform",
    AMAZON: "Amazon",
  };

  return (
    <div className="py-8">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            {t("navigation.home")}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/trending" className="hover:text-foreground transition-colors">
            {t("navigation.trending")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Product Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
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
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {/* Source */}
            <Badge variant="secondary" className="w-fit mb-3">
              {sourceLabels[product.sourceType]}
            </Badge>

            {/* Name */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{product.name}</h1>

            {/* Price */}
            {product.price && (
              <div className="text-3xl font-bold text-primary mb-6">
                {product.currency || "$"}
                {parseFloat(product.price).toFixed(2)}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <Card className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </Card>
            )}

            {/* Actions */}
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
        </div>
      </Container>
    </div>
  );
}
