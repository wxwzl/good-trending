import { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://goodtrending.com";

  // Static pages
  const staticPages = ["", "/trending", "/topics", "/search", "/about"];

  // Generate entries for all locales
  const entries: MetadataRoute.Sitemap = [];

  // Add static pages for each locale
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : page === "/trending" ? "hourly" : "weekly",
        priority: page === "" ? 1 : page === "/trending" ? 0.9 : page === "/topics" ? 0.8 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${baseUrl}/${l}${page}`])),
        },
      });
    }
  }

  // Add root redirect
  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });

  return entries;
}
