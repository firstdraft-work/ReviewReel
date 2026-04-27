import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-6xl font-black">{t("title")}</h1>
      <p className="text-muted text-lg font-semibold">{t("message")}</p>
      <Link
        className="bg-ink px-6 py-3 text-sm font-black text-white transition hover:bg-black"
        href="/"
      >
        {t("backHome")}
      </Link>
    </main>
  );
}
