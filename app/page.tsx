import Link from "next/link";
import { UploadForm } from "@/components/upload-form";
import { SiteHeader } from "@/components/site-header";
import { isGeminiConfigured } from "@/lib/gemini";

export default function HomePage() {
  const liveAi = isGeminiConfigured();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="mb-10 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-red-400">
              MarTech Track 2 · Brand Simulation Engine
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Backfire OS
            </h1>
            <p className="mb-4 text-lg text-zinc-300">
              Penetration testing for marketing campaigns. Upload a draft campaign and
              watch five adversarial AI personas stress-test it against Bangladesh&apos;s
              cultural, linguistic, and regulatory landscape.
            </p>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>• 5 parallel red-team agents with Banglish RAG context</li>
              <li>• Meme mutation simulator with Memeability scores</li>
              <li>• 6-metric Backfire Score dashboard</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/heatmap" className="text-red-300 hover:text-red-200">
                Heat Map →
              </Link>
              <Link href="/boardroom" className="text-red-300 hover:text-red-200">
                Boardroom →
              </Link>
              <Link href="/post-mortem" className="text-red-300 hover:text-red-200">
                Pre-Mortem →
              </Link>
            </div>
          </div>
          <UploadForm liveAi={liveAi} />
        </section>
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
        MarTech Track 2 · Infinity AI BuildFest 2026
      </footer>
    </>
  );
}
