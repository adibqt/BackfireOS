"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentVerdict } from "@/lib/agents/types";
import { useLanguage } from "./language-provider";
import { t } from "@/lib/i18n";

export function UploadForm({ liveAi = false }: { liveAi?: boolean }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [slogan, setSlogan] = useState("");
  const [brandValues, setBrandValues] = useState("");
  const [brief, setBrief] = useState("");
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [verdicts, setVerdicts] = useState<AgentVerdict[]>([]);
  const [error, setError] = useState("");

  const handleImage = (file?: File) => {
    if (!file) return;
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
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-300">{t(locale, "slogan")}</label>
          <input
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder={t(locale, "sloganPlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">{t(locale, "brandValues")}</label>
          <textarea
            value={brandValues}
            onChange={(e) => setBrandValues(e.target.value)}
            placeholder={t(locale, "brandValuesPlaceholder")}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">{t(locale, "brief")}</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={t(locale, "briefPlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">{t(locale, "imageUpload")}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImage(e.target.files?.[0])}
            className="block w-full text-sm text-zinc-300"
          />
        </div>
        <button
          type="button"
          disabled={loading || !slogan.trim()}
          onClick={runSimulation}
          className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? status || t(locale, "analyzing") : t(locale, "runSimulation")}
        </button>
        {!loading && (
          <p
            className={`text-xs ${liveAi ? "text-emerald-400" : "text-amber-400"}`}
          >
            {t(locale, liveAi ? "liveMode" : "demoMode")}
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {verdicts.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-sm text-zinc-300">{t(locale, "agentVerdicts")}: {verdicts.length}/5</p>
            <div className="space-y-2">
              {verdicts.map((v) => (
                <div key={v.agentId} className="text-xs text-zinc-400">
                  {v.agentName}: {v.severity}/100
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
