import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";
import { normalizeStepOrdering, parseRequiredStepId } from "@/lib/flavor-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    llm_system_prompt?: unknown;
    llm_user_prompt?: unknown;
    llm_temperature?: unknown;
    llm_input_type_id?: unknown;
    llm_output_type_id?: unknown;
    llm_model_id?: unknown;
    humor_flavor_step_type_id?: unknown;
  } | null;
  const llmInputTypeId = parseRequiredStepId(payload?.llm_input_type_id);
  const llmOutputTypeId = parseRequiredStepId(payload?.llm_output_type_id);
  const llmModelId = parseRequiredStepId(payload?.llm_model_id);
  const humorFlavorStepTypeId = parseRequiredStepId(payload?.humor_flavor_step_type_id);

  if (!llmInputTypeId || !llmOutputTypeId || !llmModelId || !humorFlavorStepTypeId) {
    return NextResponse.json(
      {
        error:
          "Model, input type, output type, and step type are required before saving a step.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("humor_flavor_steps")
    .update({
      llm_system_prompt: typeof payload?.llm_system_prompt === "string" ? payload.llm_system_prompt : "",
      llm_user_prompt: typeof payload?.llm_user_prompt === "string" ? payload.llm_user_prompt : "",
      llm_temperature: typeof payload?.llm_temperature === "number" ? payload.llm_temperature : 0.7,
      llm_input_type_id: llmInputTypeId,
      llm_output_type_id: llmOutputTypeId,
      llm_model_id: llmModelId,
      humor_flavor_step_type_id: humorFlavorStepTypeId,
    })
    .eq("id", id)
    .select(
      "id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ step: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { data: existing, error: existingError } = await auth.supabase
    .from("humor_flavor_steps")
    .select("id, humor_flavor_id")
    .eq("id", id)
    .single();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 404 });
  }

  const { error } = await auth.supabase.from("humor_flavor_steps").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: remaining, error: remainingError } = await auth.supabase
    .from("humor_flavor_steps")
    .select("id, order_by")
    .eq("humor_flavor_id", existing.humor_flavor_id);

  if (remainingError) {
    return NextResponse.json({ error: remainingError.message }, { status: 500 });
  }

  for (const step of normalizeStepOrdering(remaining ?? [])) {
    const { error: updateError } = await auth.supabase
      .from("humor_flavor_steps")
      .update({ order_by: step.order_by })
      .eq("id", step.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
