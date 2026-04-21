"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { formatUtc, slugify } from "@/lib/format";
import type { FlavorSummary, PrimitiveId } from "@/lib/types";

type FlavorFormState = {
  description: string;
  slug: string;
};

type DeleteFlavorResponse = {
  error?: string;
  linkedStepCount?: number;
} | null;

function getBlockedDeleteMessage(stepCount: number) {
  if (stepCount === 1) {
    return "This humor flavor has 1 linked step. Remove it first before deleting the flavor.";
  }

  return `This humor flavor has ${stepCount} linked steps. Remove them first before deleting the flavor.`;
}

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<FlavorSummary | null>(null);
  const [deleteDialogFlavor, setDeleteDialogFlavor] = useState<FlavorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlavorFormState>({ description: "", slug: "" });

  useEffect(() => {
    const key = "humor-flavor-studio:onboarding-seen";
    if (!window.localStorage.getItem(key)) {
      setShowOnboarding(true);
    }
  }, []);

  function closeOnboarding() {
    window.localStorage.setItem("humor-flavor-studio:onboarding-seen", "true");
    setShowOnboarding(false);
  }

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

  function closeDeleteDialog() {
    if (deletingId) return;
    setDeleteDialogFlavor(null);
  }

  async function confirmDeleteFlavor() {
    if (!deleteDialogFlavor) return;

    const key = String(deleteDialogFlavor.id);
    setDeletingId(key);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });

      const json = (await response.json().catch(() => null)) as DeleteFlavorResponse;
      if (!response.ok) {
        if (response.status === 409 && typeof json?.linkedStepCount === "number") {
          setDeleteDialogFlavor((current) => {
            if (!current || String(current.id) !== key) return current;
            return { ...current, stepCount: json.linkedStepCount ?? current.stepCount };
          });
          return;
        }

        throw new Error(json?.error || "Unable to delete humor flavor.");
      }

      setDeleteDialogFlavor(null);
      router.refresh();
    } catch (error) {
      setDeleteDialogFlavor(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete humor flavor.");
    } finally {
      setDeletingId(null);
    }
  }

  async function duplicateFlavor(id: PrimitiveId) {
    if (!window.confirm("Duplicate this humor flavor and all of its linked steps?")) {
      return;
    }

    const key = String(id);
    setDuplicatingId(key);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(key)}/duplicate`, {
        method: "POST",
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to duplicate humor flavor.");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to duplicate humor flavor.");
    } finally {
      setDuplicatingId(null);
    }
  }

  const deleteStepCount = deleteDialogFlavor?.stepCount ?? 0;
  const deleteBlocked = deleteStepCount > 0;
  const deletePending = deleteDialogFlavor ? deletingId === String(deleteDialogFlavor.id) : false;

  return (
    <>
      {showOnboarding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <section
            className="w-full max-w-xl rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-6 shadow-[var(--shadow-soft)] md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-onboarding-title"
          >
            <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">Start here</p>
            <h2 id="studio-onboarding-title" className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
              Open a flavor card to edit and test the prompt chain.
            </h2>
            <p className="mt-4 text-lg leading-7 text-[color:var(--muted-foreground)]">
              Use the <span className="font-semibold text-[color:var(--foreground)]">Open</span> button on a card, or create a{" "}
              <span className="font-semibold text-[color:var(--foreground)]">New flavor</span> if you are starting from scratch.
            </p>
            <button
              type="button"
              onClick={closeOnboarding}
              className="mt-7 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)]"
            >
              Got it
            </button>
          </section>
        </div>
      ) : null}

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
        <div className="rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--accent-soft)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">Next action</p>
          <p className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
            <span className="text-[color:var(--accent)]">Open</span> a flavor card to edit, then{" "}
            <span className="text-[color:var(--accent)]">test</span> it with an image.
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted-foreground)]">
            The card controls are on the right. Use New flavor if this is your first chain.
          </p>
        </div>

        {filtered.map((flavor) => (
          <article
            key={String(flavor.id)}
            className="group relative grid gap-4 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] md:grid-cols-[1.5fr_0.85fr_0.8fr]"
          >
            <div className="pointer-events-none absolute right-5 top-5 hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)] opacity-0 transition group-hover:opacity-100 md:flex">
              Open card <span aria-hidden="true">-&gt;</span>
            </div>
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
              Select Open to work with this flavor. The detail view exposes every prompt directly and keeps technical IDs in an advanced section.
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
              <Link
                href={`/flavors/${encodeURIComponent(String(flavor.id))}`}
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-[color:var(--accent-foreground)] shadow-[var(--shadow-soft)] transition group-hover:scale-[1.03]"
              >
                Open this card
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
                onClick={() => duplicateFlavor(flavor.id)}
                disabled={duplicatingId === String(flavor.id)}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm disabled:opacity-60"
              >
                {duplicatingId === String(flavor.id) ? "Duplicating..." : "Duplicate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setDeleteDialogFlavor(flavor);
                }}
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

      <Modal
        open={Boolean(deleteDialogFlavor)}
        title={deleteBlocked ? "Cannot delete humor flavor" : "Delete humor flavor?"}
        description={
          deleteDialogFlavor
            ? deleteBlocked
              ? getBlockedDeleteMessage(deleteStepCount)
              : "Are you sure you want to delete this humor flavor? This action cannot be undone."
            : undefined
        }
        onClose={closeDeleteDialog}
        showHeaderClose={false}
        closeDisabled={deletePending}
      >
        {deleteDialogFlavor ? (
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteDialog}
              disabled={deletePending}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm disabled:opacity-60"
            >
              {deleteBlocked ? "Close" : "Cancel"}
            </button>
            {deleteBlocked ? (
              <Link
                href={`/flavors/${encodeURIComponent(String(deleteDialogFlavor.id))}`}
                onClick={() => setDeleteDialogFlavor(null)}
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)]"
              >
                View/Edit Steps
              </Link>
            ) : (
              <button
                type="button"
                onClick={confirmDeleteFlavor}
                disabled={deletePending}
                className="rounded-full bg-[color:var(--danger)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
              >
                {deletePending ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
