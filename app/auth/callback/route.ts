import { NextResponse } from "next/server";
import { isAuthorizedProfile } from "@/lib/auth";
import {
  STUDIO_HOME_PATH,
  STUDIO_LOGIN_PATH,
  STUDIO_UNAUTHORIZED_PATH,
} from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(STUDIO_LOGIN_PATH, requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL(STUDIO_LOGIN_PATH, requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(STUDIO_LOGIN_PATH, requestUrl.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAuthorizedProfile(profile)) {
    return NextResponse.redirect(new URL(STUDIO_UNAUTHORIZED_PATH, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(STUDIO_HOME_PATH, requestUrl.origin));
}
