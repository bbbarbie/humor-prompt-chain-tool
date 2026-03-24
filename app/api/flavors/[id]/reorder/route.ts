import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    steps?: Array<{ id?: string | number; order_by?: number }>;
  } | null;

  if (!Array.isArray(payload?.steps) || payload.steps.length === 0) {
    return NextResponse.json({ error: "A reordered step list is required." }, { status: 400 });
  }

  const normalized = payload.steps
    .filter((step) => step.id !== undefined && step.id !== null)
    .map((step, index) => ({
      id: step.id,
      order_by: index + 1,
    }));

  for (const step of normalized) {
    const { error } = await auth.supabase
      .from("humor_flavor_steps")
      .update({ order_by: step.order_by })
      .eq("id", step.id)
      .eq("humor_flavor_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
