"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { formatUtc, slugify } from "@/lib/format";
import type { FlavorSummary, PrimitiveId } from "@/lib/types";

type FlavorFormState = {
  description: string;
  slug: string;
};

function FlavorForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  loading,
}: {
  value: FlavorFormState;
  onChange: (next: FlavorFormState) => void;
  onSubmit: () => void;
  submitLabel: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">Flavor title</span>
        <input
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value, slug: value.slug })}
          onBlur={() => {
            if (!value.slug.trim()) {
              onChange({ description: value.description, slug: slugify(value.description) });
            }
          }}
          className="w-full rounded-2xl border bg-transparent px-4 py-3 outline-none transition focus:border-[color:var(--border-strong)]"
          placeholder="Deadpan escalation"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Slug</span>
        <input
          value={value.slug}
          onChange={(event) => onChange({ ...value, slug: slugify(event.target.value) })}
          className="w-full rounded-2xl border bg-transparent px-4 py-3 outline-none transition focus:border-[color:var(--border-strong)]"
          placeholder="deadpan-escalation"
        />
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

export function StudioDashboardClient({ flavors }: { flavors: FlavorSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<FlavorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FlavorFormState>({ description: "", slug: "" });

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return flavors;

    return flavors.filter((flavor) => {
      return (
        String(flavor.description ?? "").toLowerCase().includes(normalized) ||
        String(flavor.slug ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [flavors, query]);

  async function createFlavor() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/flavors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to create humor flavor.");
      }

      setCreateOpen(false);
      setForm({ description: "", slug: "" });
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create humor flavor.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!editingFlavor) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(editingFlavor.id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to update humor flavor.");
      }

      setEditingFlavor(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update humor flavor.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteFlavor(id: PrimitiveId) {
    if (!window.confirm("Delete this humor flavor? Deletion is blocked while steps still exist.")) {
      return;
    }

    setErrorMessage(null);

    const response = await fetch(`/api/flavors/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setErrorMessage(json?.error || "Unable to delete humor flavor.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-7 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Humor Flavor Studio</p>
          <h2 className="mt-3 max-w-2xl font-serif text-6xl leading-none tracking-tight">Build prompt chains with real sequence, readable prompts, and testing built in.</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--muted-foreground)]">
            Manage humor flavors as calm, editorial objects instead of raw rows. Open a flavor to edit ordered steps, tune temperatures, and test against the image set.
          </p>
        </div>

        <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--panel)] p-7 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Studio Controls</p>
              <h3 className="mt-3 font-serif text-4xl tracking-tight">Flavor index</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm({ description: "", slug: "" });
                setCreateOpen(true);
              }}
              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)]"
            >
              New flavor
            </button>
          </div>

          <label className="mt-6 block">
            <span className="sr-only">Search flavors</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title or slug"
              className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[color:var(--border-strong)]"
            />
          </label>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">Flavors</p>
              <p className="mt-2 text-3xl">{flavors.length}</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">Total steps</p>
              <p className="mt-2 text-3xl">{flavors.reduce((sum, flavor) => sum + flavor.stepCount, 0)}</p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-8 space-y-4">
        {filtered.map((flavor) => (
          <article
            key={String(flavor.id)}
            className="group grid gap-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] md:grid-cols-[1.5fr_0.85fr_0.8fr]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
                  {flavor.stepCount} steps
                </span>
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">
                  {flavor.slug || "no-slug"}
                </span>
              </div>
              <div>
                <h3 className="font-serif text-4xl tracking-tight">{flavor.description || "Untitled flavor"}</h3>
                <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
                  Updated {formatUtc(flavor.modified_datetime_utc || flavor.created_datetime_utc)}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4 text-sm text-[color:var(--muted-foreground)]">
              Use this flavor as a structured prompt chain. The detail view exposes every prompt directly and keeps technical IDs in an advanced section.
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
              <Link
                href={`/flavors/${encodeURIComponent(String(flavor.id))}`}
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)]"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditingFlavor(flavor);
                  setForm({
                    description: flavor.description || "",
                    slug: flavor.slug || "",
                  });
                }}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteFlavor(flavor.id)}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--danger)]"
              >
                Delete
              </button>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[color:var(--border-strong)] p-10 text-center text-sm text-[color:var(--muted-foreground)]">
            No humor flavors match this search.
          </div>
        ) : null}
      </section>

      <Modal
        open={createOpen}
        title="Create humor flavor"
        description="Use description as the main studio title. Slug stays visible as secondary metadata."
        onClose={() => setCreateOpen(false)}
      >
        <FlavorForm value={form} onChange={setForm} onSubmit={createFlavor} submitLabel="Create flavor" loading={loading} />
      </Modal>

      <Modal
        open={Boolean(editingFlavor)}
        title="Edit humor flavor"
        description="Update the editorial title and slug without affecting the linked step chain."
        onClose={() => setEditingFlavor(null)}
      >
        <FlavorForm value={form} onChange={setForm} onSubmit={saveEdit} submitLabel="Save changes" loading={loading} />
      </Modal>
    </>
  );
}
