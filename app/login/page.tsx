import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginClient } from "@/components/login-client";
import { getStudioAccessState } from "@/lib/auth";
import { STUDIO_APP_NAME, STUDIO_HOME_PATH, STUDIO_UNAUTHORIZED_PATH } from "@/lib/navigation";

export const metadata: Metadata = {
  title: `Sign in | ${STUDIO_APP_NAME}`,
};

export default async function LoginPage() {
  const access = await getStudioAccessState();

  if (access.status === "authorized") {
    redirect(STUDIO_HOME_PATH);
  }

  if (access.status === "unauthorized") {
    redirect(STUDIO_UNAUTHORIZED_PATH);
  }

  return <LoginClient />;
}
