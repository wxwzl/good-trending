import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  // 排除 backend 路径，避免 API 代理被添加 locale 前缀
  matcher: ["/", "/(en|zh)/:path*", "/((?!api|backend|_next|_vercel|.*\\..*).*)"],
};
