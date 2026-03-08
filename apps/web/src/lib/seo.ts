/**
 * SEO Metadata Utilities
 *
 * Provides helper functions for generating consistent metadata
 * across all pages with proper Twitter Card, Open Graph, and canonical URLs.
 */

import type { Metadata } from "next";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://goodtrending.com";

/**
 * Site-wide default metadata
 */
export const siteConfig = {
  name: "Good Trending",
  description: "Track the hottest products from X Platform and Amazon daily",
  twitterHandle: "@goodtrending",
  defaultImage: "/og-image.png",
};

/**
 * Generate Twitter Card metadata
 */
interface TwitterCardOptions {
  title: string;
  description: string;
  image?: string;
  cardType?: "summary" | "summary_large_image";
}

export function generateTwitterCard({
  title,
  description,
  image,
  cardType = "summary_large_image",
}: TwitterCardOptions): Metadata["twitter"] {
  return {
    card: cardType,
    title,
    description,
    images: image ? [image] : [`${baseUrl}${siteConfig.defaultImage}`],
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  };
}

/**
 * Generate Open Graph metadata
 */
interface OpenGraphOptions {
  title: string;
  description: string;
  url: string;
  locale: Locale;
  images?: string[];
  type?: "website" | "article" | "product";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

export function generateOpenGraph({
  title,
  description,
  url,
  locale,
  images,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
}: OpenGraphOptions): Metadata["openGraph"] {
  const ogLocale = locale === "zh" ? "zh_CN" : "en_US";
  const alternateLocales = locales
    .filter((l) => l !== locale)
    .map((l) => (l === "zh" ? "zh_CN" : "en_US"));
  // TODO: 这些 locale 映射可以提取到配置中

  const og: Metadata["openGraph"] = {
    title,
    description,
    url,
    siteName: siteConfig.name,
    locale: ogLocale,
    alternateLocale: alternateLocales,
    type: type as "website",
    images: images?.length
      ? images.map((img) => ({
          url: img.startsWith("http") ? img : `${baseUrl}${img}`,
          width: 1200,
          height: 630,
          alt: title,
        }))
      : [
          {
            url: `${baseUrl}${siteConfig.defaultImage}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
  };

  // Add article-specific metadata
  if (type === "article") {
    return {
      ...og,
      type: "article",
      publishedTime,
      modifiedTime,
      authors,
    } as Metadata["openGraph"];
  }

  return og;
}

/**
 * Generate alternates for hreflang tags
 */
interface AlternatesOptions {
  currentPath: string;
  currentLocale: Locale;
}

export function generateAlternates({
  currentPath,
  currentLocale,
}: AlternatesOptions): Metadata["alternates"] {
  const canonicalUrl = `${baseUrl}/${currentLocale}${currentPath}`;

  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const hrefLang = locale === "zh" ? "zh-CN" : "en-US";
    // TODO: 这些 locale 映射可以提取到配置中
    languages[hrefLang] = `${baseUrl}/${locale}${currentPath}`;
  }

  // Add x-default pointing to default locale
  languages["x-default"] = `${baseUrl}/${defaultLocale}${currentPath}`;

  return {
    canonical: canonicalUrl,
    languages,
  };
}

/**
 * Generate complete page metadata
 */
interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article" | "product";
}

export function generatePageMetadata({
  title,
  description,
  path,
  locale,
  image,
  keywords = [],
  noIndex = false,
  type = "website",
}: PageMetadataOptions): Metadata {
  const url = `${baseUrl}/${locale}${path}`;
  const defaultKeywords = [
    "trending",
    "products",
    "amazon",
    "twitter",
    "x platform",
    "deals",
    "hot products",
  ];

  return {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: generateAlternates({ currentPath: path, currentLocale: locale }),
    openGraph: generateOpenGraph({
      title,
      description,
      url,
      locale,
      images: image ? [image] : undefined,
      type,
    }),
    twitter: generateTwitterCard({
      title,
      description,
      image,
    }),
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/**
 * Generate product-specific metadata
 */
interface ProductMetadataOptions {
  name: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  productId: string;
  locale: Locale;
}

export function generateProductMetadata({
  name,
  description,
  image,
  price,
  currency,
  productId,
  locale,
}: ProductMetadataOptions): Metadata {
  const path = `/product/${productId}`;
  const url = `${baseUrl}/${locale}${path}`;
  const fullDescription = description
    ? description.slice(0, 160)
    : `${name} - ${siteConfig.description}`;

  const title = price
    ? `${name} - ${currency || "$"}${parseFloat(price).toFixed(2)} | ${siteConfig.name}`
    : `${name} | ${siteConfig.name}`;

  return {
    title,
    description: fullDescription,
    keywords: [name, "product", "trending", "item"],
    authors: [{ name: siteConfig.name }],
    metadataBase: new URL(baseUrl),
    alternates: generateAlternates({ currentPath: path, currentLocale: locale }),
    openGraph: generateOpenGraph({
      title,
      description: fullDescription,
      url,
      locale,
      images: image ? [image] : undefined,
      type: "website",
    }),
    twitter: generateTwitterCard({
      title,
      description: fullDescription,
      image,
    }),
    other: {
      "product:price:amount": price || "0",
      "product:price:currency": currency || "USD",
    },
  };
}
