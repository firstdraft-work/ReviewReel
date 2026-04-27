import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";

export default async function Home() {
  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");

  return (
    <main className="min-h-screen flex flex-col">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-line">
        <span className="text-sm font-bold uppercase tracking-[0.18em] text-muted">{nav("brand")}</span>
        <div className="flex items-center gap-4">
          <LangToggle />
          <Link
            href="/generate"
            className="bg-ink px-5 py-2 text-sm font-bold text-white hover:bg-black transition"
          >
            {nav("startCreating")}
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.08] text-balance">
            {t("headline")}<br />
            <span className="text-accent">{t("headlineAccent")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted leading-7 max-w-lg mx-auto">
            {t("description")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/generate"
              className="bg-ink px-8 py-4 text-base font-black text-white hover:bg-black transition"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-line">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8">
          <Feature title={t("feature1Title")} description={t("feature1Desc")} />
          <Feature title={t("feature2Title")} description={t("feature2Desc")} />
          <Feature title={t("feature3Title")} description={t("feature3Desc")} />
          <Feature title={t("feature4Title")} description={t("feature4Desc")} />
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-line text-center">
        <p className="text-muted text-sm font-semibold">{t("footer")}</p>
      </footer>
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center sm:text-left">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-muted text-sm leading-6">{description}</p>
    </div>
  );
}
