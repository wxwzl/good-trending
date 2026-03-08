import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { locales, type Locale } from "@/i18n/config";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://goodtrending.com";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const t = await getTranslations({ locale: currentLocale, namespace: "metadata" });

  const title = t("defaultTitle");
  const description = t("siteDescription");
  const siteName = t("siteName");

  const alternates: Record<string, string> = {};
  for (const l of locales) {
    const hrefLang = l === "zh" ? "zh-CN" : "en-US";
    alternates[hrefLang] = `${baseUrl}/${l}`;
  }
  alternates["x-default"] = `${baseUrl}/en`;

  return {
    title: {
      template: t("titleTemplate"),
      default: title,
    },
    description,
    keywords: t("defaultKeywords").split(","),
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: alternates,
    },
    openGraph: {
      type: "website",
      locale: t("locale"),
      alternateLocale: [t("alternateLocale")],
      title,
      description,
      siteName,
      url: `${baseUrl}/${locale}`,
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@goodtrending",
      creator: "@goodtrending",
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentLocale = locale as Locale;

  // Validate locale
  if (!locales.includes(currentLocale)) {
    // Default to English if invalid locale
    setRequestLocale("en");
  } else {
    setRequestLocale(locale);
  }

  const messages = await getMessages();

  // Get translations for JSON-LD
  const t = await getTranslations({ locale: currentLocale, namespace: "metadata" });
  const siteName = t("siteName");
  const siteDescription = t("siteDescription");

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />

        {/* Preload critical assets */}
        <link rel="preload" href="/og-image.png" as="image" />

        {/* Theme initialization script to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch {}
            `,
          }}
        />

        {/* Structured Data for SEO */}
        <OrganizationJsonLd />
        <WebSiteJsonLd locale={currentLocale} name={siteName} description={siteDescription} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden`}
      >
        <NextTopLoader
          color="#2563eb"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #2563eb,0 0 5px #2563eb"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
              <Footer />
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
