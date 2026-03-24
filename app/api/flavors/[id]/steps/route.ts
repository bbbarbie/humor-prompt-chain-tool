import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";
import { parseRequiredStepId } from "@/lib/flavor-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const { count, error: countError } = await auth.supabase
    .from("humor_flavor_steps")
    .select("id", { count: "exact", head: true })
    .eq("humor_flavor_id", id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const nextOrder = (count ?? 0) + 1;
  const llmInputTypeId = parseRequiredStepId(payload?.llm_input_type_id);
  const llmOutputTypeId = parseRequiredStepId(payload?.llm_output_type_id);
  const llmModelId = parseRequiredStepId(payload?.llm_model_id);
  const humorFlavorStepTypeId = parseRequiredStepId(payload?.humor_flavor_step_type_id);

  if (!llmInputTypeId || !llmOutputTypeId || !llmModelId || !humorFlavorStepTypeId) {
    return NextResponse.json(
      {
        error:
          "Model, input type, output type, and step type are required before creating a step.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: id,
      created_datetime_utc: new Date().toISOString(),
      order_by: nextOrder,
      llm_system_prompt: typeof payload?.llm_system_prompt === "string" ? payload.llm_system_prompt : "",
      llm_user_prompt: typeof payload?.llm_user_prompt === "string" ? payload.llm_user_prompt : "",
      llm_temperature: typeof payload?.llm_temperature === "number" ? payload.llm_temperature : 0.7,
      llm_input_type_id: llmInputTypeId,
      llm_output_type_id: llmOutputTypeId,
      llm_model_id: llmModelId,
      humor_flavor_step_type_id: humorFlavorStepTypeId,
    })
    .select(
      "id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ step: data });
}
