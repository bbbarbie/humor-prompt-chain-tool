import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    description?: unknown;
    slug?: unknown;
  } | null;

  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const slug = typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!description || !slug) {
    return NextResponse.json({ error: "Description and slug are required." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("humor_flavors")
    .update({
      description,
      slug,
      modified_datetime_utc: new Date().toISOString(),
      modified_by_user_id: auth.user.id,
    })
    .eq("id", id)
    .select(
      "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flavor: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { count, error: stepCountError } = await auth.supabase
    .from("humor_flavor_steps")
    .select("id", { count: "exact", head: true })
    .eq("humor_flavor_id", id);

  if (stepCountError) {
    return NextResponse.json({ error: stepCountError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "Delete blocked. Remove all steps in this humor flavor first.",
        linkedStepCount: count ?? 0,
      },
      { status: 409 },
    );
  }

  const { error } = await auth.supabase.from("humor_flavors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
