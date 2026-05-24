import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function PlaceholderFeature({
  locale,
  titleKey,
  description,
}: {
  locale: Locale;
  titleKey: "heatmap" | "branches" | "boardroom" | "postMortem";
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-2xl border border-dashed border-white/20 bg-zinc-900/50 p-8 text-center">
        <span className="mb-4 inline-block rounded-full bg-red-600/20 px-3 py-1 text-xs font-medium text-red-300">
          {t(locale, "comingSoon")}
        </span>
        <h1 className="mb-3 text-3xl font-bold text-white">{t(locale, titleKey)}</h1>
        <p className="mb-6 text-zinc-400">{description}</p>
        <div className="mb-6 grid gap-3 text-left text-sm text-zinc-500">
          <div className="h-16 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-16 animate-pulse rounded-lg bg-zinc-800" />
          <div className="h-16 animate-pulse rounded-lg bg-zinc-800" />
        </div>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          {t(locale, "newSimulation")}
        </Link>
      </div>
    </div>
  );
}
