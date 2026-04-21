"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { getPreferredOptionId } from "@/lib/flavor-helpers";
import { formatUtc, slugify } from "@/lib/format";
import type {
  HumorFlavor,
  HumorFlavorStep,
  PrimitiveId,
  SelectOption,
  StudioRunResult,
  TestImage,
} from "@/lib/types";

type StepDraft = {
  llm_system_prompt: string;
  llm_user_prompt: string;
  llm_temperature: string;
  llm_model_id: string;
  llm_input_type_id: string;
  llm_output_type_id: string;
  humor_flavor_step_type_id: string;
};

type DeleteFlavorResponse = {
  error?: string;
  linkedStepCount?: number;
} | null;

type StepFormProps = {
  draft: StepDraft;
  modelOptions: SelectOption[];
  inputTypeOptions: SelectOption[];
  outputTypeOptions: SelectOption[];
  stepTypeOptions: SelectOption[];
  onChange: (next: StepDraft) => void;
};

const EMPTY_STEP: StepDraft = {
  llm_system_prompt: "",
  llm_user_prompt: "",
  llm_temperature: "0.7",
  llm_model_id: "",
  llm_input_type_id: "",
  llm_output_type_id: "",
  humor_flavor_step_type_id: "",
};

const RUNNER_SKELETON_COUNT = 3;

function createDefaultStepDraft({
  modelOptions,
  inputTypeOptions,
  outputTypeOptions,
  stepTypeOptions,
}: {
  modelOptions: SelectOption[];
  inputTypeOptions: SelectOption[];
  outputTypeOptions: SelectOption[];
  stepTypeOptions: SelectOption[];
}): StepDraft {
  return {
    ...EMPTY_STEP,
    llm_model_id: getPreferredOptionId(modelOptions),
    llm_input_type_id: getPreferredOptionId(inputTypeOptions, 1),
    llm_output_type_id: getPreferredOptionId(outputTypeOptions, 1),
    humor_flavor_step_type_id: getPreferredOptionId(stepTypeOptions, 1),
  };
}

function toStepDraft(step: HumorFlavorStep | null | undefined, defaultStepDraft: StepDraft): StepDraft {
  if (!step) return defaultStepDraft;

  return {
    llm_system_prompt: step.llm_system_prompt || "",
    llm_user_prompt: step.llm_user_prompt || "",
    llm_temperature: String(step.llm_temperature ?? 0.7),
    llm_model_id: step.llm_model_id == null ? defaultStepDraft.llm_model_id : String(step.llm_model_id),
    llm_input_type_id:
      step.llm_input_type_id == null ? defaultStepDraft.llm_input_type_id : String(step.llm_input_type_id),
    llm_output_type_id:
      step.llm_output_type_id == null ? defaultStepDraft.llm_output_type_id : String(step.llm_output_type_id),
    humor_flavor_step_type_id:
      step.humor_flavor_step_type_id == null
        ? defaultStepDraft.humor_flavor_step_type_id
        : String(step.humor_flavor_step_type_id),
  };
}

function toApiStepPayload(draft: StepDraft) {
  const temperature = Number(draft.llm_temperature);

  return {
    llm_system_prompt: draft.llm_system_prompt,
    llm_user_prompt: draft.llm_user_prompt,
    llm_temperature: Number.isFinite(temperature) ? temperature : 0.7,
    llm_model_id: draft.llm_model_id,
    llm_input_type_id: draft.llm_input_type_id,
    llm_output_type_id: draft.llm_output_type_id,
    humor_flavor_step_type_id: draft.humor_flavor_step_type_id,
  };
}

function getStepValidationError(draft: StepDraft) {
  if (!draft.llm_model_id) return "Select a valid model before saving this step.";
  if (!draft.llm_input_type_id) return "Select a valid input type before saving this step.";
  if (!draft.llm_output_type_id) return "Select a valid output type before saving this step.";
  if (!draft.humor_flavor_step_type_id) return "Select a valid step type before saving this step.";
  return null;
}

function getBlockedDeleteMessage(stepCount: number) {
  if (stepCount === 1) {
    return "This humor flavor has 1 linked step. Remove it first before deleting the flavor.";
  }

  return `This humor flavor has ${stepCount} linked steps. Remove them first before deleting the flavor.`;
}

function LoadingSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin`}
    />
  );
}

function StepForm({
  draft,
  modelOptions,
  inputTypeOptions,
  outputTypeOptions,
  stepTypeOptions,
  onChange,
}: StepFormProps) {
  function renderSelect(label: string, value: string, options: SelectOption[], onValueChange: (value: string) => void) {
    return (
      <label className="block space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">{label}</span>
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={options.length === 0}
          className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[color:var(--border-strong)]"
        >
          {options.length === 0 ? <option value="">No options available</option> : null}
          {options.map((option) => (
            <option key={String(option.id)} value={String(option.id)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-medium">System prompt</span>
        <textarea
          rows={6}
          value={draft.llm_system_prompt}
          onChange={(event) => onChange({ ...draft, llm_system_prompt: event.target.value })}
          className="w-full rounded-3xl border bg-transparent px-4 py-4 outline-none transition focus:border-[color:var(--border-strong)]"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">User prompt</span>
        <textarea
          rows={8}
          value={draft.llm_user_prompt}
          onChange={(event) => onChange({ ...draft, llm_user_prompt: event.target.value })}
          className="w-full rounded-3xl border bg-transparent px-4 py-4 outline-none transition focus:border-[color:var(--border-strong)]"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">Temperature</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.llm_temperature}
            onChange={(event) => onChange({ ...draft, llm_temperature: event.target.value })}
            className="w-full rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[color:var(--border-strong)]"
          />
        </label>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]">
          Keep prompt fields in the main editing surface. Technical IDs live below in advanced configuration.
        </div>
      </div>

      <details className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4">
        <summary className="cursor-pointer text-sm font-medium">Advanced configuration</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {renderSelect("Model", draft.llm_model_id, modelOptions, (value) => onChange({ ...draft, llm_model_id: value }))}
          {renderSelect("Input type", draft.llm_input_type_id, inputTypeOptions, (value) =>
            onChange({ ...draft, llm_input_type_id: value }),
          )}
          {renderSelect("Output type", draft.llm_output_type_id, outputTypeOptions, (value) =>
            onChange({ ...draft, llm_output_type_id: value }),
          )}
          {renderSelect("Step type", draft.humor_flavor_step_type_id, stepTypeOptions, (value) =>
            onChange({ ...draft, humor_flavor_step_type_id: value }),
          )}
        </div>
      </details>
    </div>
  );
}

function RecentRuns({
  runs,
  activeFlavorId,
}: {
  runs: StudioRunResult[];
  activeFlavorId: string;
}) {
  const filtered = runs.filter((run) => run.flavorId === activeFlavorId);

  if (filtered.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[color:var(--border-strong)] p-6 text-sm text-[color:var(--muted-foreground)]">
        No stored studio runs for this flavor yet. Results from each test appear here in this browser.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((run) => (
        <article key={run.id} className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Recent studio run</p>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{formatUtc(run.createdAt)}</p>
            </div>
            {run.imageUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                <Image src={run.imageUrl} alt="" fill className="object-cover" />
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {run.captions.map((caption, index) => (
              <div key={`${run.id}-${index}`} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4 text-sm leading-6">
                {caption}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function FlavorDetailClient({
  flavor,
  steps,
  modelOptions,
  inputTypeOptions,
  outputTypeOptions,
  stepTypeOptions,
  testImages,
}: {
  flavor: HumorFlavor;
  steps: HumorFlavorStep[];
  modelOptions: SelectOption[];
  inputTypeOptions: SelectOption[];
  outputTypeOptions: SelectOption[];
  stepTypeOptions: SelectOption[];
  testImages: TestImage[];
}) {
  const router = useRouter();
  const defaultStepDraft = useMemo(
    () =>
      createDefaultStepDraft({
        modelOptions,
        inputTypeOptions,
        outputTypeOptions,
        stepTypeOptions,
      }),
    [modelOptions, inputTypeOptions, outputTypeOptions, stepTypeOptions],
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingFlavor, setEditingFlavor] = useState(false);
  const [deleteDialogStepCount, setDeleteDialogStepCount] = useState<number | null>(null);
  const [flavorDescription, setFlavorDescription] = useState(flavor.description || "");
  const [flavorSlug, setFlavorSlug] = useState(flavor.slug || "");
  const [activeStep, setActiveStep] = useState<HumorFlavorStep | null>(null);
  const [stepDraft, setStepDraft] = useState<StepDraft>(defaultStepDraft);
  const [createStepOpen, setCreateStepOpen] = useState(false);
  const [deletingFlavor, setDeletingFlavor] = useState(false);
  const [savingFlavor, setSavingFlavor] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [duplicatingFlavor, setDuplicatingFlavor] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(testImages[0] ? String(testImages[0].id) : "");
  const [runnerLoading, setRunnerLoading] = useState(false);
  const [runnerErrorMessage, setRunnerErrorMessage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<StudioRunResult | null>(null);
  const [recentRuns, setRecentRuns] = useState<StudioRunResult[]>([]);

  useEffect(() => {
    const key = `humor-flavor-studio:runs`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as StudioRunResult[];
      if (Array.isArray(parsed)) {
        setRecentRuns(parsed);
      }
    } catch {
      // Ignore malformed local history.
    }
  }, []);

  useEffect(() => {
    if (!createStepOpen && !activeStep) {
      setStepDraft(defaultStepDraft);
    }
  }, [activeStep, createStepOpen, defaultStepDraft]);

  function persistRuns(next: StudioRunResult[]) {
    setRecentRuns(next);
    window.localStorage.setItem("humor-flavor-studio:runs", JSON.stringify(next.slice(0, 20)));
  }

  const orderedSteps = useMemo(() => {
    return [...steps].sort((a, b) => (a.order_by ?? Number.MAX_SAFE_INTEGER) - (b.order_by ?? Number.MAX_SAFE_INTEGER));
  }, [steps]);

  const selectedImage = useMemo(() => {
    return testImages.find((image) => String(image.id) === selectedImageId) ?? null;
  }, [selectedImageId, testImages]);

  async function saveFlavor() {
    setSavingFlavor(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: flavorDescription,
          slug: flavorSlug || slugify(flavorDescription),
        }),
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to update flavor.");
      }

      setEditingFlavor(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update flavor.");
    } finally {
      setSavingFlavor(false);
    }
  }

  function closeDeleteDialog() {
    if (deletingFlavor) return;
    setDeleteDialogStepCount(null);
  }

  async function confirmDeleteFlavor() {
    setDeletingFlavor(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}`, {
        method: "DELETE",
      });

      const json = (await response.json().catch(() => null)) as DeleteFlavorResponse;
      if (!response.ok) {
        if (response.status === 409 && typeof json?.linkedStepCount === "number") {
          setDeleteDialogStepCount(json.linkedStepCount);
          return;
        }

        throw new Error(json?.error || "Unable to delete flavor.");
      }

      setDeleteDialogStepCount(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      setDeleteDialogStepCount(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete flavor.");
    } finally {
      setDeletingFlavor(false);
    }
  }

  async function duplicateFlavor() {
    if (!window.confirm("Duplicate this humor flavor and all of its linked steps?")) {
      return;
    }

    setDuplicatingFlavor(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}/duplicate`, {
        method: "POST",
      });

      const json = (await response.json().catch(() => null)) as { error?: string; flavor?: { id?: string | number } } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to duplicate flavor.");
      }

      const duplicatedId = json?.flavor?.id;
      if (duplicatedId == null) {
        throw new Error("Duplicate succeeded but no new flavor id was returned.");
      }

      router.push(`/flavors/${encodeURIComponent(String(duplicatedId))}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to duplicate flavor.");
    } finally {
      setDuplicatingFlavor(false);
    }
  }

  async function createStep() {
    const validationError = getStepValidationError(stepDraft);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSavingStep(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiStepPayload(stepDraft)),
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to create step.");
      }

      setCreateStepOpen(false);
      setStepDraft(defaultStepDraft);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create step.");
    } finally {
      setSavingStep(false);
    }
  }

  async function saveStep() {
    if (!activeStep) return;
    const validationError = getStepValidationError(stepDraft);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSavingStep(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/steps/${encodeURIComponent(String(activeStep.id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiStepPayload(stepDraft)),
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to update step.");
      }

      setActiveStep(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update step.");
    } finally {
      setSavingStep(false);
    }
  }

  async function deleteStep(id: PrimitiveId) {
    if (!window.confirm("Delete this step and renormalize order?")) {
      return;
    }

    const response = await fetch(`/api/steps/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setErrorMessage(json?.error || "Unable to delete step.");
      return;
    }

    router.refresh();
  }

  async function moveStep(stepId: PrimitiveId, direction: "up" | "down") {
    const index = orderedSteps.findIndex((step) => String(step.id) === String(stepId));
    if (index === -1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= orderedSteps.length) return;

    const next = [...orderedSteps];
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;

    const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: next.map((step, orderIndex) => ({
          id: step.id,
          order_by: orderIndex + 1,
        })),
      }),
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setErrorMessage(json?.error || "Unable to reorder steps.");
      return;
    }

    router.refresh();
  }

  async function runFlavor() {
    if (!selectedImageId) {
      setErrorMessage(null);
      setRunnerErrorMessage("Select a test image first.");
      setCurrentResult(null);
      return;
    }

    setRunnerLoading(true);
    setErrorMessage(null);
    setRunnerErrorMessage(null);
    setCurrentResult(null);

    try {
      const response = await fetch(`/api/flavors/${encodeURIComponent(String(flavor.id))}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: selectedImageId }),
      });

      const json = (await response.json().catch(() => null)) as { error?: string; captions?: string[] } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Unable to generate captions.");
      }

      const image = testImages.find((item) => String(item.id) === selectedImageId);
      const nextResult: StudioRunResult = {
        id: crypto.randomUUID(),
        flavorId: String(flavor.id),
        flavorName: flavor.description || "Untitled flavor",
        imageId: selectedImageId,
        imageUrl: image?.url || null,
        createdAt: new Date().toISOString(),
        captions: json?.captions || [],
      };

      setRunnerErrorMessage(null);
      setCurrentResult(nextResult);
      persistRuns([nextResult, ...recentRuns]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate captions.";
      setCurrentResult(null);
      setRunnerErrorMessage(message);
    } finally {
      setRunnerLoading(false);
    }
  }

  const deleteDialogOpen = deleteDialogStepCount !== null;
  const deleteBlocked = (deleteDialogStepCount ?? 0) > 0;

  return (
    <>
      <div className="mb-6">
        <Link href="/" className="text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
          Back to flavors
        </Link>
      </div>

      <section className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div className="space-y-8">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 md:p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Flavor detail</p>
                <h2 className="mt-2 font-serif text-4xl leading-none tracking-tight sm:text-5xl">
                  {flavor.description || "Untitled flavor"}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                  <span className="rounded-full border border-[color:var(--border)] px-3 py-1">
                    {orderedSteps.length} {orderedSteps.length === 1 ? "step" : "steps"}
                  </span>
                  <span className="rounded-full border border-[color:var(--border)] px-3 py-1">{flavor.slug || "no-slug"}</span>
                  <span className="rounded-full border border-[color:var(--border)] px-3 py-1">
                    Updated {formatUtc(flavor.modified_datetime_utc || flavor.created_datetime_utc)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => setEditingFlavor(true)}
                  className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm"
                >
                  Edit flavor
                </button>
                <button
                  type="button"
                  onClick={duplicateFlavor}
                  disabled={duplicatingFlavor}
                  className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm disabled:opacity-60"
                >
                  {duplicatingFlavor ? "Duplicating..." : "Duplicate flavor"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setDeleteDialogStepCount(steps.length);
                  }}
                  className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--danger)]"
                >
                  Delete flavor
                </button>
              </div>
            </div>
          </div>

          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Ordered steps</p>
                <h3 className="mt-2 font-serif text-4xl tracking-tight">Prompt chain blocks</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStepDraft(defaultStepDraft);
                  setCreateStepOpen(true);
                }}
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-[color:var(--accent-foreground)]"
              >
                Add step
              </button>
            </div>

            <div className="space-y-4">
              {orderedSteps.map((step, index) => (
                <article
                  key={String(step.id)}
                  className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-sm font-semibold">
                        {step.order_by ?? index + 1}
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Step {index + 1}</p>
                        <p className="text-sm text-[color:var(--muted-foreground)]">Temperature {step.llm_temperature ?? 0.7}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moveStep(step.id, "up")}
                        disabled={index === 0}
                        className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] disabled:opacity-40"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(step.id, "down")}
                        disabled={index === orderedSteps.length - 1}
                        className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] disabled:opacity-40"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStep(step);
                          setStepDraft(toStepDraft(step, defaultStepDraft));
                        }}
                        className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStep(step.id)}
                        className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--danger)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">System prompt</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{step.llm_system_prompt || "No system prompt yet."}</p>
                    </div>
                    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel-muted)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">User prompt</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{step.llm_user_prompt || "No user prompt yet."}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Model {step.llm_model_id ?? "unset"}</span>
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Input {step.llm_input_type_id ?? "unset"}</span>
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Output {step.llm_output_type_id ?? "unset"}</span>
                    <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Type {step.humor_flavor_step_type_id ?? "unset"}</span>
                  </div>
                </article>
              ))}

              {orderedSteps.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-[color:var(--border-strong)] p-10 text-center text-sm text-[color:var(--muted-foreground)]">
                  No steps yet. Add the first prompt block to begin the chain.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <aside className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-6 md:p-7 xl:p-8 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Testing panel</p>
            <h3 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Run this flavor</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
              The runner sends the selected image plus the assembled ordered prompt chain to the Assignment 5 REST API at <code>api.almostcrackd.ai</code>.
            </p>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">Choose an image</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {testImages.map((image) => {
                  const isSelected = String(image.id) === selectedImageId;

                  return (
                    <button
                      key={String(image.id)}
                      type="button"
                      onClick={() => setSelectedImageId(String(image.id))}
                      className={[
                        "group overflow-hidden rounded-[24px] border text-left transition focus:outline-none",
                        isSelected
                          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] shadow-[var(--shadow-soft)]"
                          : "border-[color:var(--border)] bg-[color:var(--panel-muted)] hover:border-[color:var(--border-strong)]",
                      ].join(" ")}
                      aria-pressed={isSelected}
                    >
                      <div className="relative aspect-square bg-[color:var(--panel)]">
                        {image.url ? (
                          <Image
                            src={image.url}
                            alt={image.image_description || `Test image ${image.id}`}
                            fill
                            className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[color:var(--muted-foreground)]">
                            Image preview unavailable
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 p-4">
                        <p className="truncate text-sm font-medium">{image.image_description || `Image ${image.id}`}</p>
                        <span
                          className={[
                            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
                            isSelected
                              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                              : "border-[color:var(--border)] text-[color:var(--muted-foreground)]",
                          ].join(" ")}
                        >
                          {isSelected ? "Selected" : "Choose"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedImage ? (
              <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel)]">
                <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="relative min-h-80 bg-[color:var(--panel-muted)] xl:min-h-[22rem]">
                    {selectedImage.url ? (
                      <Image
                        src={selectedImage.url}
                        alt={selectedImage.image_description || `Selected image ${selectedImage.id}`}
                        fill
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[color:var(--muted-foreground)]">
                        Selected image preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-6">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Image for this run</p>
                    <p className="text-base font-medium">{selectedImage.image_description || `Image ${selectedImage.id}`}</p>
                    {selectedImage.additional_context ? (
                      <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{selectedImage.additional_context}</p>
                    ) : (
                      <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">This image is ready for the next flavor test run.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={runFlavor}
              disabled={runnerLoading || orderedSteps.length === 0 || !selectedImageId}
              aria-busy={runnerLoading}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runnerLoading ? (
                <>
                  <LoadingSpinner className="h-4 w-4" />
                  Generating...
                </>
              ) : (
                "Generate captions"
              )}
            </button>
          </aside>

          <section className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 md:p-7 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Current result</p>
            <h3 className="mt-2 font-serif text-4xl tracking-tight">Generated captions</h3>
            <div className="mt-4 space-y-3" aria-live="polite" aria-busy={runnerLoading}>
              {runnerLoading ? (
                <>
                  <div className="rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--panel)] p-5 shadow-[var(--shadow-soft)]">
                    <div className="flex items-start gap-3">
                      <LoadingSpinner className="mt-0.5 h-5 w-5 text-[color:var(--accent)]" />
                      <div>
                        <p className="text-sm font-medium">Generating captions...</p>
                        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">This may take a few seconds.</p>
                      </div>
                    </div>
                  </div>

                  {Array.from({ length: RUNNER_SKELETON_COUNT }).map((_, index) => (
                    <div
                      key={`caption-skeleton-${index}`}
                      className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="space-y-3 animate-pulse">
                        <div className="h-3 rounded-full bg-[color:var(--panel-muted)]" />
                        <div className="h-3 w-11/12 rounded-full bg-[color:var(--panel-muted)]" />
                        <div
                          className={[
                            "h-3 rounded-full bg-[color:var(--panel-muted)]",
                            index === 0 ? "w-8/12" : index === 1 ? "w-9/12" : "w-7/12",
                          ].join(" ")}
                        />
                      </div>
                    </div>
                  ))}
                </>
              ) : currentResult?.captions?.length ? (
                currentResult.captions.map((caption, index) => (
                  <div key={`${currentResult.id}-${index}`} className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-sm leading-6 shadow-[var(--shadow-soft)]">
                    {caption}
                  </div>
                ))
              ) : (
                <>
                  {runnerErrorMessage ? (
                    <div className="rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--danger-soft)] p-4 text-sm">
                      {runnerErrorMessage}
                    </div>
                  ) : null}
                  <div className="rounded-[24px] border border-dashed border-[color:var(--border-strong)] p-6 text-sm text-[color:var(--muted-foreground)]">
                    Run the selected flavor on a test image to see captions here.
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 md:p-7 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">Flavor-linked results</p>
            <h3 className="mt-2 font-serif text-4xl tracking-tight">Recent studio runs</h3>
            <div className="mt-4">
              <RecentRuns runs={recentRuns} activeFlavorId={String(flavor.id)} />
            </div>
          </section>
        </div>
      </section>

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm">
          {errorMessage}
        </p>
      ) : null}

      <Modal
        open={editingFlavor}
        title="Edit humor flavor"
        description="Description is the primary title. Slug remains the secondary identifier in the studio."
        onClose={() => setEditingFlavor(false)}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Flavor title</span>
            <input
              value={flavorDescription}
              onChange={(event) => setFlavorDescription(event.target.value)}
              onBlur={() => {
                if (!flavorSlug.trim()) {
                  setFlavorSlug(slugify(flavorDescription));
                }
              }}
              className="w-full rounded-2xl border bg-transparent px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Slug</span>
            <input
              value={flavorSlug}
              onChange={(event) => setFlavorSlug(slugify(event.target.value))}
              className="w-full rounded-2xl border bg-transparent px-4 py-3 outline-none"
            />
          </label>
          <button
            type="button"
            onClick={saveFlavor}
            disabled={savingFlavor}
            className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
          >
            {savingFlavor ? "Saving..." : "Save changes"}
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteDialogOpen}
        title={deleteBlocked ? "Cannot delete humor flavor" : "Delete humor flavor?"}
        description={
          deleteDialogOpen
            ? deleteBlocked
              ? getBlockedDeleteMessage(deleteDialogStepCount ?? 0)
              : "Are you sure you want to delete this humor flavor? This action cannot be undone."
            : undefined
        }
        onClose={closeDeleteDialog}
        showHeaderClose={false}
        closeDisabled={deletingFlavor}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={closeDeleteDialog}
            disabled={deletingFlavor}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            {deleteBlocked ? "Close" : "Cancel"}
          </button>
          {deleteBlocked ? null : (
            <button
              type="button"
              onClick={confirmDeleteFlavor}
              disabled={deletingFlavor}
              className="rounded-full bg-[color:var(--danger)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
            >
              {deletingFlavor ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </Modal>

      <Modal
        open={createStepOpen}
        title="Create flavor step"
        description="Each new step is appended to the end of the chain and gets the next sequential order."
        onClose={() => setCreateStepOpen(false)}
      >
        <StepForm
          draft={stepDraft}
          modelOptions={modelOptions}
          inputTypeOptions={inputTypeOptions}
          outputTypeOptions={outputTypeOptions}
          stepTypeOptions={stepTypeOptions}
          onChange={setStepDraft}
        />
        <button
          type="button"
          onClick={createStep}
          disabled={savingStep}
          className="mt-6 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
        >
          {savingStep ? "Saving..." : "Create step"}
        </button>
      </Modal>

      <Modal
        open={Boolean(activeStep)}
        title="Edit flavor step"
        description="Prompt fields stay front and center. Advanced technical IDs are available but secondary."
        onClose={() => setActiveStep(null)}
      >
        <StepForm
          draft={stepDraft}
          modelOptions={modelOptions}
          inputTypeOptions={inputTypeOptions}
          outputTypeOptions={outputTypeOptions}
          stepTypeOptions={stepTypeOptions}
          onChange={setStepDraft}
        />
        <button
          type="button"
          onClick={saveStep}
          disabled={savingStep}
          className="mt-6 rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] disabled:opacity-60"
        >
          {savingStep ? "Saving..." : "Save step"}
        </button>
      </Modal>
    </>
  );
}
