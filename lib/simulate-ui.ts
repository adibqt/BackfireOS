import type { AgentVerdict } from "@/lib/agents/types";
import type { strings } from "@/lib/i18n";

export type VerdictKey = "pullBack" | "tuneIt" | "shipIt";
export type AxisInterpretationKey =
  | "axisDormant"
  | "axisQuiet"
  | "axisActive"
  | "axisSevere"
  | "axisCatastrophic";

export function scoreVerdictKey(score: number): VerdictKey {
  if (score >= 70) return "pullBack";
  if (score >= 40) return "tuneIt";
  return "shipIt";
}

export function axisInterpretationKey(score: number): AxisInterpretationKey {
  if (score >= 80) return "axisCatastrophic";
  if (score >= 60) return "axisSevere";
  if (score >= 40) return "axisActive";
  if (score >= 20) return "axisQuiet";
  return "axisDormant";
}

export function truncateQuote(text: string, maxLen = 90): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trim()}…`;
}

export function topAgentQuote(verdicts: AgentVerdict[], maxLen = 90): string {
  if (verdicts.length === 0) return "";
  const top = [...verdicts].sort((a, b) => b.severity - a.severity)[0];
  return truncateQuote(top.reasoning, maxLen);
}

export function formatSimulationEyebrow(createdAt: string): {
  date: string;
  time: string;
} {
  const d = new Date(createdAt);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

export function formatEyebrowString(
  locale: "en" | "bn",
  createdAt: string,
  t: (locale: "en" | "bn", key: keyof (typeof strings)["en"]) => string
): string {
  const { date, time } = formatSimulationEyebrow(createdAt);
  return t(locale, "simulationEyebrow")
    .replace("{date}", date)
    .replace("{time}", time);
}
