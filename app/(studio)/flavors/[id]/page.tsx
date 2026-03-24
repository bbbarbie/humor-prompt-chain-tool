import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlavorDetailClient } from "@/components/flavor-detail-client";
import { requireStudioPageAccess } from "@/lib/auth";
import { STUDIO_APP_NAME } from "@/lib/navigation";
import type { HumorFlavor, HumorFlavorStep, SelectOption, TestImage } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadOptions(
  supabase: Awaited<ReturnType<typeof requireStudioPageAccess>>["supabase"],
  table: string,
) {
  const fallback: SelectOption[] = [];
  const attempts = [
    { columns: "id, description" },
    { columns: "id, name" },
    { columns: "id, slug" },
    { columns: "id" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await supabase.from(table).select(attempt.columns).limit(100);

    if (error) {
      continue;
    }

    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string | number,
      label: String(row.description ?? row.name ?? row.slug ?? row.id),
    }));
  }

  return fallback;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await requireStudioPageAccess();

  const { data: flavorData } = await supabase
    .from("humor_flavors")
    .select("description")
    .eq("id", id)
    .maybeSingle();

  const flavorName = flavorData?.description || "Flavor detail";

  return {
    title: `${flavorName} | ${STUDIO_APP_NAME}`,
  };
}

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireStudioPageAccess();

  const { data: flavorData, error: flavorError } = await supabase
    .from("humor_flavors")
    .select(
      "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
    )
    .eq("id", id)
    .maybeSingle();

  if (flavorError) {
    throw new Error(`Failed to load humor flavor: ${flavorError.message}`);
  }

  if (!flavorData) {
    notFound();
  }

  const { data: stepsData, error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .select(
      "id, created_datetime_utc, humor_flavor_id, llm_temperature, order_by, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt",
    )
    .eq("humor_flavor_id", id)
    .order("order_by", { ascending: true });

  if (stepsError) {
    throw new Error(`Failed to load humor flavor steps: ${stepsError.message}`);
  }

  const { data: imagesData } = await supabase
    .from("images")
    .select("id, url, image_description, additional_context, created_datetime_utc")
    .limit(24)
    .order("created_datetime_utc", { ascending: false });

  const [modelOptions, inputTypeOptions, outputTypeOptions, stepTypeOptions] = await Promise.all([
    loadOptions(supabase, "llm_models"),
    loadOptions(supabase, "llm_input_types"),
    loadOptions(supabase, "llm_output_types"),
    loadOptions(supabase, "humor_flavor_step_types"),
  ]);

  return (
    <FlavorDetailClient
      flavor={flavorData as HumorFlavor}
      steps={(stepsData ?? []) as HumorFlavorStep[]}
      modelOptions={modelOptions}
      inputTypeOptions={inputTypeOptions}
      outputTypeOptions={outputTypeOptions}
      stepTypeOptions={stepTypeOptions}
      testImages={(imagesData ?? []) as TestImage[]}
    />
  );
}
