import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold">{t("siteName")}</h3>
            <p className="text-sm text-muted-foreground">{t("siteDescription")}</p>
          </div>

          <div className="space-y-4 text-center">
            <h4 className="text-sm font-semibold">{t("navigation.home")}</h4>
            <nav className="flex flex-col gap-2 items-center">
              <Link
                href="/trending"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("navigation.trending")}
              </Link>
              <Link
                href="/topics"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("navigation.topics")}
              </Link>
            </nav>
          </div>

          <div className="space-y-4 text-center">
            <h4 className="text-sm font-semibold">{t("navigation.about")}</h4>
            <nav className="flex flex-col gap-2 items-center">
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("navigation.about")}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {t("footer.copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
