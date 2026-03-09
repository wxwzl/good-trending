/**
 * JSON-LD Structured Data Components
 *
 * Provides React components for generating structured data (JSON-LD)
 * for SEO optimization. Supports WebSite, Product, ItemList, and BreadcrumbList schemas.
 */

import { locales, type Locale, localeMappings } from "@/i18n/config";
import type { SourceType } from "@good-trending/dto/common";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://goodtrending.com";

/**
 * WebSite structured data for the homepage
 * Enables sitelinks searchbox in Google search results
 */
interface WebSiteJsonLdProps {
  locale: Locale;
  name: string;
  description: string;
}

export function WebSiteJsonLd({ locale, name, description }: WebSiteJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    description,
    url: `${baseUrl}/${locale}`,
    inLanguage: localeMappings.inLanguage[locale],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Product structured data for product detail pages
 * Enables rich snippets with price, availability, and ratings
 */
interface ProductJsonLdProps {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  sourceType: SourceType;
  sourceUrl: string;
  locale: Locale;
}

export function ProductJsonLd({
  id,
  name,
  description,
  image,
  price,
  currency = "USD",
  sourceType,
  sourceUrl,
  locale,
}: ProductJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description || name,
    image: image || undefined,
    url: `${baseUrl}/${locale}/product/${id}`,
    sku: id,
    brand: {
      "@type": "Brand",
      name: sourceType === "AMAZON" ? "Amazon" : "X Platform",
    },
    offers: price
      ? {
          "@type": "Offer",
          url: sourceUrl,
          priceCurrency: currency,
          price: parseFloat(price).toFixed(2),
          availability: "https://schema.org/InStock",
          seller: {
            "@type": "Organization",
            name: sourceType === "AMAZON" ? "Amazon" : "X Platform",
          },
        }
      : undefined,
  };

  // Remove undefined values
  const cleanData = JSON.parse(JSON.stringify(structuredData));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanData) }}
    />
  );
}

/**
 * ItemList structured data for listing pages (trending, topics)
 * Helps search engines understand the list content
 */
interface ListItem {
  id: string;
  name: string;
  url: string;
  image?: string;
  position: number;
}

interface ItemListJsonLdProps {
  name: string;
  description?: string;
  items: ListItem[];
}

export function ItemListJsonLd({ name, description, items }: ItemListJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
      image: item.image || undefined,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * BreadcrumbList structured data for navigation
 * Helps search engines understand site structure
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Organization structured data for the site
 * Used for branding in search results
 */
export function OrganizationJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Good Trending",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      "https://twitter.com/goodtrending",
      // Add other social media URLs here
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

/**
 * Generate alternate language links for hreflang tags
 */
export function generateAlternateLanguages(currentPath: string, currentLocale: Locale) {
  return locales
    .filter((locale) => locale !== currentLocale)
    .map((locale) => ({
      hrefLang: locale === "zh" ? "zh-CN" : "en-US",
      href: `${baseUrl}/${locale}${currentPath}`,
    }));
}

/**
 * Generate all alternate language links including current
 */
export function generateAllAlternateLanguages(currentPath: string) {
  return locales.map((locale) => ({
    hrefLang: locale === "zh" ? "zh-CN" : "en-US",
    href: `${baseUrl}/${locale}${currentPath}`,
  }));
}
