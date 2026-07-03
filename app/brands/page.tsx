"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHero } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { PendingButtonLink } from "@/components/ui/pending-link";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/agents/types";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [statedValues, setStatedValues] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBrands = async () => {
    try {
      const res = await fetch("/api/brands");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Failed to load brands (${res.status})`);
        return;
      }
      setBrands(data.brands ?? []);
      setError("");
    } catch {
      setError("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStatedValues("");
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, statedValues }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create brand");
        return;
      }
      resetForm();
      await loadBrands();
    } catch {
      setError("Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand? Past campaigns will be detached but not deleted.")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete brand");
        return;
      }
      await loadBrands();
    } catch {
      setError("Failed to delete brand");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell footer={false}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <PageHero
          eyebrow="Brands"
          title="Your brands"
          description="Create a brand to anchor canonical values for the Brand Purist."
        />
        <div className="flex gap-2">
          <PendingButtonLink href="/" variant="secondary">
            New simulation
          </PendingButtonLink>
          {!showCreate && (
            <Button onClick={() => setShowCreate(true)}>
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create brand
              </span>
            </Button>
          )}
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-4 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-[15px] font-semibold text-[var(--fg)]">
              Create a brand
            </p>
            <Badge variant="accent">New</Badge>
          </div>
          <Input
            label="Brand name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Bangladesh"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line description of what the brand stands for"
            rows={2}
          />
          <Textarea
            label="Canonical stated values"
            value={statedValues}
            onChange={(e) => setStatedValues(e.target.value)}
            placeholder="The brand's public stance — what the Brand Purist will hold this brand accountable to."
            rows={3}
            hint="These are the ground-truth values the Brand Purist anchors every audit against."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} loadingLabel="Creating…" disabled={!name.trim()}>
              Create brand
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4 text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading && <ListPageSkeleton />}

      {!loading && (
        <div className="content-enter">
          {!error && brands.length === 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] py-20 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,var(--aurora-1),transparent_70%)]"
              />
              <div className="relative">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>
                <p className="font-display text-[18px] text-[var(--fg)]">No brands yet</p>
                <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
                  Create a brand to start running simulations against its canonical values.
                </p>
                {!showCreate && (
                  <Button className="mt-6" onClick={() => setShowCreate(true)}>
                    Create your first brand
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <BrandRow
                key={brand.id}
                brand={brand}
                onDelete={() => handleDelete(brand.id)}
                deleting={deletingId === brand.id}
              />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function BrandRow({
  brand,
  onDelete,
  deleting,
}: {
  brand: Brand;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5",
        "transition-colors hover:border-[var(--border-bright)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
              {brand.name}
            </p>
            <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
              {brand.id.slice(0, 8)}
            </span>
          </div>
          {brand.description && (
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{brand.description}</p>
          )}
          {brand.statedValues && (
            <p className="mt-2 line-clamp-2 text-[13px] text-[var(--fg-subtle)]">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-faint)]">
                Values ·{" "}
              </span>
              {brand.statedValues}
            </p>
          )}
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          loading={deleting}
          loadingLabel="Deleting…"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
