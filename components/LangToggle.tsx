"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "en" ? "zh-CN" : "en";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      className="text-muted text-sm font-semibold hover:text-black transition disabled:opacity-50"
      disabled={isPending}
      onClick={toggle}
      type="button"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
