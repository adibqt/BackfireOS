"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentVerdict } from "@/lib/agents/types";
import { useLanguage } from "./language-provider";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FileInput } from "@/components/ui/input";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { riskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function UploadForm({ liveAi = false }: { liveAi?: boolean }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [slogan, setSlogan] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [brief, setBrief] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [imageName, setImageName] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [verdicts, setVerdicts] = useState<AgentVerdict[]>([]);
  const [error, setError] = useState("");

  const handleImage = (file?: File) => {
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setVerdicts([]);
    setStatus("Creating campaign...");

    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slogan, brandValues, brief, imageBase64 }),
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

      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
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
          <Input
            label={t(locale, "slogan")}
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder={t(locale, "sloganPlaceholder")}
          />
          <Textarea
            label={t(locale, "brandValues")}
            value={brandValues}
            onChange={(e) => setBrandValues(e.target.value)}
            placeholder={t(locale, "brandValuesPlaceholder")}
            rows={2}
          />
          <Textarea
            label={t(locale, "brief")}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={t(locale, "briefPlaceholder")}
            rows={3}
          />
          <FileInput
            label={t(locale, "imageUpload")}
            accept="image/*"
            onFileChange={handleImage}
            hint={imageName ? `Selected: ${imageName}` : undefined}
          />

          <Button
            type="button"
            size="lg"
            disabled={loading || !slogan.trim()}
            onClick={runSimulation}
            className="w-full"
          >
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
          </Button>

          {!loading && (
            <p className="text-center text-[12px] text-[var(--fg-subtle)]">
              {t(locale, liveAi ? "liveMode" : "demoMode")}
            </p>
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
                <Badge variant="accent">{verdicts.length} / 5</Badge>
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
        </div>
      </div>
    </div>
  );
}
