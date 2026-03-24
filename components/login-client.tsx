"use client";

import { useState } from "react";
import { buildStudioAuthCallbackUrl, STUDIO_APP_NAME } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginClient() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function continueWithGoogle() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage("Missing Supabase environment variables.");
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildStudioAuthCallbackUrl(window.location.origin),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(31,91,82,0.12),transparent_35%),linear-gradient(180deg,#f2ede5,#f7f4ef_42%,#ece4d9)] dark:bg-[radial-gradient(circle_at_top,rgba(143,199,188,0.12),transparent_35%),linear-gradient(180deg,#121517,#161a1d_42%,#0e1113)]" />
      <section className="relative w-full max-w-lg rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-8 shadow-[var(--shadow-soft)] backdrop-blur md:p-10">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">{STUDIO_APP_NAME}</p>
        <h1 className="mt-3 font-serif text-5xl leading-none tracking-tight">{STUDIO_APP_NAME}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">
          Sign in to build, edit, and test humor generation workflows
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">
          Authorized superadmins and matrix admins only
        </p>

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--foreground)]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={loading}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-medium text-[color:var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Sign in with Google"}
        </button>
      </section>
    </main>
  );
}
