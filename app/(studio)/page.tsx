import type { Metadata } from "next";
import { StudioDashboardClient } from "@/components/studio-dashboard-client";
import { requireStudioPageAccess } from "@/lib/auth";
import { STUDIO_APP_NAME } from "@/lib/navigation";
import type { FlavorSummary, HumorFlavor, PrimitiveId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${STUDIO_APP_NAME} Dashboard`,
};

type StepCountRow = {
  humor_flavor_id: PrimitiveId;
};

export default async function DashboardPage() {
  const { supabase } = await requireStudioPageAccess();

  const { data: flavorsData, error: flavorsError } = await supabase
    .from("humor_flavors")
    .select(
      "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
    )
    .order("modified_datetime_utc", { ascending: false, nullsFirst: false });

  if (flavorsError) {
    throw new Error(`Failed to load humor flavors: ${flavorsError.message}`);
  }

  const { data: stepsData } = await supabase.from("humor_flavor_steps").select("humor_flavor_id");

  const stepCountByFlavor = new Map<string, number>();
  for (const row of (stepsData ?? []) as StepCountRow[]) {
    const key = String(row.humor_flavor_id);
    stepCountByFlavor.set(key, (stepCountByFlavor.get(key) ?? 0) + 1);
  }

  const flavors: FlavorSummary[] = ((flavorsData ?? []) as HumorFlavor[]).map((flavor) => ({
    ...flavor,
    stepCount: stepCountByFlavor.get(String(flavor.id)) ?? 0,
  }));

  return <StudioDashboardClient flavors={flavors} />;
}
