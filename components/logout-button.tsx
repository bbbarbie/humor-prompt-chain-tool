"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      router.replace("/login");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
    >
      Sign out
    </button>
  );
}
