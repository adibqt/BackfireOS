"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AgentVerdict, Brand, CulturalStressMap } from "@/lib/agents/types";
import { countFlaggedMarkets } from "@/lib/cultural-stress-map";
import { useLanguage } from "./language-provider";
import { t } from "@/lib/i18n";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Textarea, FileInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, RiskBadge, Kbd } from "@/components/ui/badge";
import { riskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function UploadForm({ liveAi = false }: { liveAi?: boolean }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandId, setBrandId] = useState("");
  const [slogan, setSlogan] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [brief, setBrief] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [verdicts, setVerdicts] = useState<AgentVerdict[]>([]);
  const [stressMapPreview, setStressMapPreview] = useState<CulturalStressMap | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/brands")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.brands ?? []) as Brand[];
        setBrands(list);
        if (list.length > 0) {
          setBrandId(list[0].id);
          if (list[0].statedValues && !brandValues) {
            setBrandValues(list[0].statedValues);
          }
        }
      })
      .catch(() => {})
      .finally(() => setBrandsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBrandChange = (newBrandId: string) => {
    setBrandId(newBrandId);
    const next = brands.find((b) => b.id === newBrandId);
    if (next?.statedValues) setBrandValues(next.statedValues);
  };

  const handleImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreviewUrl(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImagePreviewUrl(undefined);
    setImageBase64(undefined);
  };

  const ready = !brandsLoading && !!brandId && !!slogan.trim();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready && !loading) {
      e.preventDefault();
      runSimulation();
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setVerdicts([]);
    setStressMapPreview(null);
    setStatus("Creating campaign...");

    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, slogan, brandValues, brief, imageBase64 }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create campaign");

      const { runId } = createData as { runId: string };
      setStatus(t(locale, "analyzing"));

      const collected: AgentVerdict[] = [];

      await new Promise<void>((resolve, reject) => {
        fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId, imageBase64 }),
        }).then(async (res) => {
          if (!res.ok || !res.body) {
            reject(new Error("Simulation failed"));
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";
            for (const part of parts) {
              const lines = part.split("\n");
              const eventLine = lines.find((l) => l.startsWith("event:"));
              const dataLine = lines.find((l) => l.startsWith("data:"));
              if (!eventLine || !dataLine) continue;
              const event = eventLine.replace("event: ", "").trim();
              const data = JSON.parse(dataLine.replace("data: ", ""));
              if (event === "agent_verdict") {
                collected.push(data as AgentVerdict);
                setVerdicts([...collected]);
              } else if (event === "status") {
                setStatus((data as { message: string }).message);
              } else if (event === "stress_map") {
                setStressMapPreview(data as CulturalStressMap);
              } else if (event === "error") {
                reject(new Error((data as { message: string }).message));
              }
            }
          }
          resolve();
        }).catch(reject);
      });

      setStatus("Generating memes...");
      const memeRes = await fetch("/api/memes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, verdicts: collected }),
      });
      const memeData = await memeRes.json();
      if (!memeRes.ok) throw new Error(memeData.error || "Meme generation failed");

      router.push(`/runs/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-4 -bottom-2 -z-10 rounded-[28px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,77,87,0.18),transparent_70%)] blur-2xl"
      />

      <div
        onKeyDown={handleKeyDown}
        className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl"
      >
        {/* Indeterminate progress while a simulation streams */}
        {loading && (
          <div className="absolute inset-x-0 top-0 z-20 h-[2px] overflow-hidden bg-[var(--accent-soft)]">
            <div className="progress-indeterminate h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
          </div>
        )}

        {/* Card chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold leading-tight text-[var(--fg)]">
                New simulation
              </p>
              <p className="text-[12px] text-[var(--fg-subtle)]">
                Submit a campaign for adversarial review
              </p>
            </div>
          </div>
          <Badge variant={liveAi ? "live" : "demo"} dot>
            {liveAi ? "Live AI" : "Demo"}
          </Badge>
        </div>

        <div className="space-y-4 p-5">
          <Reveal index={0}>
            <BrandSelector
              brands={brands}
              brandsLoading={brandsLoading}
              brandId={brandId}
              onChange={handleBrandChange}
            />
          </Reveal>
          <Reveal index={1}>
            <Input
              label={t(locale, "slogan")}
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder={t(locale, "sloganPlaceholder")}
            />
          </Reveal>
          <Reveal index={2}>
            <Textarea
              label={t(locale, "brandValues")}
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
              placeholder={t(locale, "brandValuesPlaceholder")}
              rows={2}
            />
          </Reveal>

          {/* Required core above · optional context below */}
          <Reveal index={3}>
            <div className="flex items-center gap-3 pt-0.5" aria-hidden>
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                Optional context
              </span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
          </Reveal>

          <Reveal index={4}>
            <Textarea
              label={t(locale, "brief")}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t(locale, "briefPlaceholder")}
              rows={3}
            />
          </Reveal>
          <Reveal index={5}>
            <FileInput
              label={t(locale, "imageUpload")}
              accept="image/*"
              previewUrl={imagePreviewUrl}
              onFileChange={handleImage}
              onClear={handleClearImage}
            />
          </Reveal>

          <Reveal index={6}>
            <Button
              type="button"
              size="lg"
              disabled={loading || !ready}
              onClick={runSimulation}
              className="group relative w-full overflow-hidden"
            >
              {/* Hover sheen sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full"
              />
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {status || t(locale, "analyzing")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {t(locale, "runSimulation")}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </Button>
          </Reveal>

          {!loading && (
            <Reveal index={7}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[12px] text-[var(--fg-subtle)]">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                      ready ? "bg-[var(--success)] pulse-dot" : "bg-[var(--fg-faint)]"
                    )}
                  />
                  {ready ? "Ready for adversarial review" : t(locale, liveAi ? "liveMode" : "demoMode")}
                </span>
                {ready && (
                  <span className="flex shrink-0 items-center gap-1 text-[var(--fg-subtle)]">
                    <Kbd>Ctrl</Kbd>
                    <span className="text-[11px]">+</span>
                    <Kbd>Enter</Kbd>
                  </span>
                )}
              </div>
            </Reveal>
          )}

          {error && (
            <div className="flex gap-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-3 text-sm text-[var(--danger)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {verdicts.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)]/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-medium text-[var(--fg)]">
                  {t(locale, "agentVerdicts")}
                </p>
                <Badge variant="accent">{verdicts.length} / 6</Badge>
              </div>
              <div className="space-y-1.5">
                {verdicts.map((v) => (
                  <div
                    key={v.agentId}
                    className={cn(
                      "flex items-center justify-between rounded-lg bg-[var(--bg-elev-2)] px-3 py-2 fade-up"
                    )}
                  >
                    <span className="text-[13px] text-[var(--fg-muted)]">{v.agentName}</span>
                    <RiskBadge level={riskLevel(v.severity)} score={v.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {stressMapPreview && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)]/80 p-4 fade-up">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-[var(--fg)]">
                  {t(locale, "stressMapTitle")}
                </p>
                <Badge variant="accent">
                  {stressMapPreview.markets.length} {t(locale, "stressMapPreview")} ·{" "}
                  {countFlaggedMarkets(stressMapPreview)} {t(locale, "marketsFlagged")}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Staggered fade-up wrapper — sequential waterfall reveal on mount. */
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      {children}
    </div>
  );
}

function BrandSelector({
  brands,
  brandsLoading,
  brandId,
  onChange,
}: {
  brands: Brand[];
  brandsLoading: boolean;
  brandId: string;
  onChange: (id: string) => void;
}) {
  if (brandsLoading) {
    return (
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-[var(--fg-muted)]">
          Brand
        </span>
        <div className="shimmer h-11 rounded-lg" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-[var(--fg)]">
              Create a brand to run a simulation
            </p>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              Campaigns are run under a brand so the Brand Purist can audit them against the brand&rsquo;s history.
            </p>
            <ButtonLink href="/brands" variant="primary" size="sm" className="mt-3">
              Create your first brand
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="brand-id" className="text-[13px] font-medium text-[var(--fg-muted)]">
          Brand
        </label>
        <Link
          href="/brands"
          className="text-[12px] text-[var(--accent-400)] hover:underline"
        >
          Manage brands
        </Link>
      </div>
      <Select
        id="brand-id"
        value={brandId}
        onChange={(e) => onChange(e.target.value)}
      >
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
