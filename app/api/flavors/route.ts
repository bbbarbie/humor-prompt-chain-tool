import { NextResponse } from "next/server";
import { requireStudioApiAccess } from "@/lib/auth";

export async function GET() {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("humor_flavors")
    .select(
      "id, created_datetime_utc, description, slug, created_by_user_id, modified_by_user_id, modified_datetime_utc",
    )
    .order("modified_datetime_utc", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flavors: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireStudioApiAccess();
  if ("error" in auth) return auth.error;

  const payload = (await request.json().catch(() => null)) as {
    description?: unknown;
    slug?: unknown;
  } | null;

  const description = typeof payload?.description === "string" ? payload.description.trim() : "";
  const slug = typeof payload?.slug === "string" ? payload.slug.trim() : "";

  if (!description || !slug) {
    return NextResponse.json({ error: "Description and slug are required." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await auth.supabase
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flavor: data });
}
