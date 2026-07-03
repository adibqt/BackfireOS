"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "./avatar";
import { resolveAccess } from "@/lib/docs/access";
import type { DocsConfig, DocsVisibility, TeamMember } from "@/lib/docs/types";
import { cn } from "@/lib/utils";

const DEFAULT_WINDOW_START = "2026-06-10T00:00:00+06:00";
const DEFAULT_WINDOW_END = "2026-06-14T23:59:59+06:00";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const VISIBILITY_OPTIONS: { value: DocsVisibility; title: string; sub: string }[] = [
  { value: "on", title: "Public", sub: "Always accessible at /docs" },
  { value: "scheduled", title: "Scheduled", sub: "Public only inside a time window" },
  { value: "off", title: "Off", sub: "Returns a Not Available page" },
];

export function DocsAdminPanel({ initialConfig }: { initialConfig: DocsConfig }) {
  const [config, setConfig] = useState<DocsConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function patch(p: Partial<DocsConfig>) {
    setConfig((c) => ({ ...c, ...p }));
  }

  // What a member of the public sees right now (admin bypass disabled).
  const publicStatus = useMemo(
    () => resolveAccess(config, { isAdmin: false }),
    [config]
  );

  function updateMember(id: string, p: Partial<TeamMember>) {
    patch({ team: config.team.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  }
  function addMember() {
    const id = (globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}`).slice(0, 12);
    patch({ team: [...config.team, { id, name: "", role: "", email: "" }] });
  }
  function removeMember(id: string) {
    patch({ team: config.team.filter((m) => m.id !== id) });
  }
  function moveMember(id: string, dir: -1 | 1) {
    const i = config.team.findIndex((m) => m.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= config.team.length) return;
    const next = [...config.team];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ team: next });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/docs/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: config.visibility,
          startsAt: config.startsAt,
          endsAt: config.endsAt,
          previewToken: config.previewToken,
          teamName: config.teamName,
          team: config.team,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setConfig(json.config as DocsConfig);
      setMessage({ tone: "ok", text: "Saved. Changes are live." });
    } catch (e) {
      setMessage({ tone: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  const previewLink =
    config.previewToken && typeof window !== "undefined"
      ? `${window.location.origin}/docs?token=${encodeURIComponent(config.previewToken)}`
      : null;

  return (
    <div className="space-y-6">
      {/* Live status banner */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4",
          publicStatus.allowed
            ? "border-[var(--success)]/25 bg-[var(--success-soft)]"
            : "border-[var(--warning)]/25 bg-[var(--warning-soft)]"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full pulse-dot",
              publicStatus.allowed ? "bg-[var(--success)]" : "bg-[var(--warning)]"
            )}
          />
          <p className={cn("text-[14px] font-medium", publicStatus.allowed ? "text-[var(--success)]" : "text-[var(--warning)]")}>
            {publicStatus.allowed
              ? "/docs is publicly visible right now"
              : `/docs is private right now (${publicStatus.reason})`}
          </p>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {message && (
        <p
          className={cn(
            "rounded-lg border px-4 py-2.5 text-[13px]",
            message.tone === "ok"
              ? "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]"
              : "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = config.visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ visibility: opt.value })}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn("text-[14px] font-semibold", active ? "text-[var(--accent-400)]" : "text-[var(--fg)]")}>
                      {opt.title}
                    </p>
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)]"
                      )}
                    >
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{opt.sub}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-[var(--fg-muted)]">
            Used when visibility is <strong className="text-[var(--fg)]">Scheduled</strong>. Times are
            in your local timezone. Default: June 10 00:00 → June 14 23:59 (Asia/Dhaka).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Opens"
              type="datetime-local"
              value={toLocalInput(config.startsAt)}
              onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })}
              disabled={config.visibility !== "scheduled"}
            />
            <Input
              label="Closes"
              type="datetime-local"
              value={toLocalInput(config.endsAt)}
              onChange={(e) => patch({ endsAt: fromLocalInput(e.target.value) })}
              disabled={config.visibility !== "scheduled"}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              patch({
                visibility: "scheduled",
                startsAt: DEFAULT_WINDOW_START,
                endsAt: DEFAULT_WINDOW_END,
              })
            }
          >
            Use default judging window
          </Button>
        </CardContent>
      </Card>

      {/* Preview token */}
      <Card>
        <CardHeader>
          <CardTitle>Preview link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-[var(--fg-muted)]">
            Share a private link that bypasses the schedule (e.g. investor preview).
            Anyone with <code className="font-mono text-[12px]">/docs?token=…</code> can view.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                label="Preview token"
                value={config.previewToken ?? ""}
                placeholder="(none)"
                onChange={(e) => patch({ previewToken: e.target.value || null })}
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() =>
                patch({
                  previewToken: (globalThis.crypto?.randomUUID?.() ?? `tok-${Date.now()}`).replace(/-/g, "").slice(0, 16),
                })
              }
            >
              Generate
            </Button>
            {config.previewToken && (
              <Button variant="ghost" size="md" onClick={() => patch({ previewToken: null })}>
                Clear
              </Button>
            )}
          </div>
          {previewLink && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(previewLink)}
              className="block w-full truncate rounded-lg border border-[var(--border)] bg-[var(--bg-elev-1)] px-3 py-2 text-left font-mono text-[12px] text-[var(--accent-400)] transition-colors hover:bg-[var(--bg-elevated)]"
              title="Click to copy"
            >
              {previewLink}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Team showcase</CardTitle>
          <Button variant="secondary" size="sm" onClick={addMember}>
            + Add member
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Input
              label="Team name"
              value={config.teamName}
              onChange={(e) => patch({ teamName: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            {config.team.map((m, idx) => (
              <div
                key={m.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={m.name || "?"} src={m.avatarUrl} size="md" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      value={m.name}
                      onChange={(e) => updateMember(m.id, { name: e.target.value })}
                    />
                    <Input
                      label="Role"
                      value={m.role}
                      onChange={(e) => updateMember(m.id, { role: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={m.email}
                      onChange={(e) => updateMember(m.id, { email: e.target.value })}
                    />
                    <Input
                      label="Avatar URL (optional)"
                      value={m.avatarUrl ?? ""}
                      placeholder="https://…"
                      onChange={(e) => updateMember(m.id, { avatarUrl: e.target.value || undefined })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <IconBtn label="Move up" disabled={idx === 0} onClick={() => moveMember(m.id, -1)}>
                      <polyline points="18 15 12 9 6 15" />
                    </IconBtn>
                    <IconBtn label="Move down" disabled={idx === config.team.length - 1} onClick={() => moveMember(m.id, 1)}>
                      <polyline points="6 9 12 15 18 9" />
                    </IconBtn>
                    <IconBtn label="Remove" danger onClick={() => removeMember(m.id)}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </IconBtn>
                  </div>
                </div>
              </div>
            ))}
            {config.team.length === 0 && (
              <p className="text-[13px] text-[var(--fg-subtle)]">No team members yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-30",
        danger && "hover:border-[var(--danger)]/50 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
