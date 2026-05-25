"use client";

import Link from "next/link";
import { AuthButton } from "./auth-button";
import { useLanguage } from "./language-provider";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  const { locale, setLocale } = useLanguage();

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            {t(locale, "title")}
          </Link>
          <p className="text-sm text-zinc-400">{t(locale, "tagline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <AuthButton />
          <nav className="hidden gap-3 text-sm text-zinc-300 md:flex">
            <Link href="/heatmap" className="hover:text-white">
              {t(locale, "heatmap")}
            </Link>
            <Link href="/branches" className="hover:text-white">
              {t(locale, "branches")}
            </Link>
            <Link href="/boardroom" className="hover:text-white">
              {t(locale, "boardroom")}
            </Link>
            <Link href="/post-mortem" className="hover:text-white">
              {t(locale, "postMortem")}
            </Link>
          </nav>
          <div className="flex rounded-lg border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded px-2 py-1 text-xs ${locale === "en" ? "bg-red-600 text-white" : "text-zinc-400"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("bn")}
              className={`rounded px-2 py-1 text-xs ${locale === "bn" ? "bg-red-600 text-white" : "text-zinc-400"}`}
            >
              BN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
