import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { STUDIO_LOGIN_PATH, STUDIO_UNAUTHORIZED_PATH } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileAccess } from "@/lib/types";

export function isAuthorizedProfile(profile: ProfileAccess | null | undefined) {
  return profile?.is_superadmin === true || profile?.is_matrix_admin === true;
}

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: (profile as ProfileAccess | null) ?? null,
  };
}

export async function getStudioAccessState() {
  const context = await getAuthContext();

  if (!context.user) {
    return {
      status: "unauthenticated" as const,
      ...context,
    };
  }

  if (!isAuthorizedProfile(context.profile)) {
    return {
      status: "unauthorized" as const,
      ...context,
    };
  }

  return {
    status: "authorized" as const,
    ...context,
  };
}

export async function requireStudioPageAccess() {
  const context = await getStudioAccessState();

  if (context.status === "unauthenticated") {
    redirect(STUDIO_LOGIN_PATH);
  }

  if (context.status === "unauthorized") {
    redirect(STUDIO_UNAUTHORIZED_PATH);
  }

  return context;
}

export async function requireStudioApiAccess() {
  const context = await getStudioAccessState();

  if (context.status === "unauthenticated") {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (context.status === "unauthorized") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return context;
}
