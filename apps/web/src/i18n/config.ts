export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
};

/**
 * Locale 映射配置
 * 用于 SEO 和结构化数据
 */
export const localeMappings = {
  // OpenGraph locale 格式 (zh_CN, en_US)
  ogLocale: {
    en: "en_US",
    zh: "zh_CN",
  } as Record<Locale, string>,

  // HTML hreflang 格式 (en-US, zh-CN)
  hrefLang: {
    en: "en-US",
    zh: "zh-CN",
  } as Record<Locale, string>,

  // JSON-LD inLanguage 格式 (en-US, zh-CN)
  inLanguage: {
    en: "en-US",
    zh: "zh-CN",
  } as Record<Locale, string>,
};
