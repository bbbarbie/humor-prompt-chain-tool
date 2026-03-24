import type { HumorFlavorStep, PrimitiveId, SelectOption } from "@/lib/types";

type CaptionRecord = string | Record<string, unknown>;
type CaptionsResponse =
  | CaptionRecord[]
  | {
      captions?: CaptionRecord[];
      data?: CaptionRecord[];
      caption?: string;
    }
  | null;

function toCaptionText(entry: CaptionRecord) {
  if (typeof entry === "string") return entry;
  if (typeof entry.content === "string") return entry.content;
  if (typeof entry.caption === "string") return entry.caption;
  if (typeof entry.text === "string") return entry.text;
  return null;
}

export function normalizeCaptions(payload: CaptionsResponse): string[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload
      .map(toCaptionText)
      .filter((value): value is string => Boolean(value && value.trim()));
  }

  if (typeof payload.caption === "string" && payload.caption.trim()) {
    return [payload.caption];
  }

  const candidates = payload.captions ?? payload.data;
  if (!Array.isArray(candidates)) return [];

  return candidates
    .map(toCaptionText)
    .filter((value): value is string => Boolean(value && value.trim()));
}

export function normalizeStepOrdering<T extends Pick<HumorFlavorStep, "id" | "order_by">>(steps: T[]) {
  return [...steps]
    .sort((a, b) => (a.order_by ?? Number.MAX_SAFE_INTEGER) - (b.order_by ?? Number.MAX_SAFE_INTEGER))
    .map((step, index) => ({
      id: step.id,
      order_by: index + 1,
    }));
}

export function buildPromptChain(steps: HumorFlavorStep[]) {
  const orderedSteps = [...steps].sort(
    (a, b) => (a.order_by ?? Number.MAX_SAFE_INTEGER) - (b.order_by ?? Number.MAX_SAFE_INTEGER),
  );

  return orderedSteps.map((step, index) => ({
    stepNumber: index + 1,
    orderBy: step.order_by ?? index + 1,
    llm_temperature: step.llm_temperature ?? 0.7,
    llm_input_type_id: step.llm_input_type_id,
    llm_output_type_id: step.llm_output_type_id,
    llm_model_id: step.llm_model_id,
    humor_flavor_step_type_id: step.humor_flavor_step_type_id,
    llm_system_prompt: step.llm_system_prompt ?? "",
    llm_user_prompt: step.llm_user_prompt ?? "",
  }));
}

export function parseRequiredStepId(value: unknown): PrimitiveId | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

export function getPreferredOptionId(options: SelectOption[], preferredId?: PrimitiveId): string {
  if (preferredId != null) {
    const match = options.find((option) => String(option.id) === String(preferredId));
    if (match) {
      return String(match.id);
    }
  }

  return options[0] ? String(options[0].id) : "";
}
