import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center space-y-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("home.title")}
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              {t("home.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/trending"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("home.viewTrending")}
              </Link>
              <Link
                href="/topics"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {t("home.browseTopics")}
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6">
            <div
              className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-primary/30 opacity-30"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
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
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("trending.source.x_platform")}</h3>
              <p className="text-sm text-muted-foreground">
                Track trending products discussed on X Platform in real-time
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
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
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("trending.source.amazon")}</h3>
              <p className="text-sm text-muted-foreground">
                Discover best-selling products from Amazon updated daily
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
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
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("trending.score")}</h3>
              <p className="text-sm text-muted-foreground">
                Smart ranking algorithm based on mentions, reviews and sentiment
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
