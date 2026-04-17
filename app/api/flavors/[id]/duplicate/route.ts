import { NextResponse } from "next/server";
import { slugify } from "@/lib/format";
import { requireStudioApiAccess } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExistingFlavorRow = {
  description: string | null;
  slug: string | null;
};

function buildUniqueValue(base: string, existing: Set<string>, suffixSeparator: string) {
  const normalizedBase = base.trim();
  if (!existing.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${normalizedBase}${suffixSeparator}${index}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique duplicate name.");
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const [{ data: flavor, error: flavorError }, { data: steps, error: stepsError }, { data: existingFlavors, error: existingError }] =
    await Promise.all([
      auth.supabase
        .from("humor_flavors")
        .select(
          "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
        )
        .eq("id", id)
        .maybeSingle(),
      auth.supabase
        .from("humor_flavor_steps")
        .select(
          "order_by, llm_system_prompt, llm_user_prompt, llm_temperature, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id",
        )
        .eq("humor_flavor_id", id)
        .order("order_by", { ascending: true }),
      auth.supabase.from("humor_flavors").select("description, slug"),
    ]);

  if (flavorError) {
    return NextResponse.json({ error: flavorError.message }, { status: 500 });
  }

  if (!flavor) {
    return NextResponse.json({ error: "Humor flavor not found." }, { status: 404 });
  }

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingNames = new Set(
    ((existingFlavors ?? []) as ExistingFlavorRow[])
      .map((row) => row.description?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const existingSlugs = new Set(
    ((existingFlavors ?? []) as ExistingFlavorRow[])
      .map((row) => row.slug?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  const baseDescription = `${flavor.description?.trim() || "Untitled flavor"} Copy`;
  const baseSlugSeed = slugify(flavor.slug?.trim() || flavor.description?.trim() || "untitled-flavor") || "untitled-flavor";
  const baseSlug = `${baseSlugSeed}-copy`;

  const description = buildUniqueValue(baseDescription, existingNames, " ");
  const slug = buildUniqueValue(baseSlug, existingSlugs, "-");
  const now = new Date().toISOString();

  const { data: duplicatedFlavor, error: insertFlavorError } = await auth.supabase
    .from("humor_flavors")
    .insert({
      description,
      slug,
      created_datetime_utc: now,
      modified_datetime_utc: now,
      created_by_user_id: auth.user.id,
      modified_by_user_id: auth.user.id,
    })
    .select(
      "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
    )
    .single();

  if (insertFlavorError) {
    return NextResponse.json({ error: insertFlavorError.message }, { status: 500 });
  }

  const stepRows = (steps ?? []) as Array<Record<string, unknown>>;

  if (stepRows.length > 0) {
    const { error: insertStepsError } = await auth.supabase.from("humor_flavor_steps").insert(
      stepRows.map((step) => ({
        humor_flavor_id: duplicatedFlavor.id,
        created_datetime_utc: now,
        order_by: step.order_by,
        llm_system_prompt: typeof step.llm_system_prompt === "string" ? step.llm_system_prompt : "",
        llm_user_prompt: typeof step.llm_user_prompt === "string" ? step.llm_user_prompt : "",
        llm_temperature: typeof step.llm_temperature === "number" ? step.llm_temperature : 0.7,
        llm_input_type_id: step.llm_input_type_id,
        llm_output_type_id: step.llm_output_type_id,
        llm_model_id: step.llm_model_id,
        humor_flavor_step_type_id: step.humor_flavor_step_type_id,
      })),
    );

    if (insertStepsError) {
      await auth.supabase.from("humor_flavors").delete().eq("id", duplicatedFlavor.id);
      return NextResponse.json({ error: insertStepsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ flavor: duplicatedFlavor });
}
