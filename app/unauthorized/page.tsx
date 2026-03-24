import type { Metadata } from "next";
import { LogoutButton } from "@/components/logout-button";
import { STUDIO_APP_NAME } from "@/lib/navigation";

export const metadata: Metadata = {
  title: `Unauthorized | ${STUDIO_APP_NAME}`,
};

export default function UnauthorizedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(143,63,54,0.1),transparent_34%),linear-gradient(180deg,#f2ede5,#f7f4ef_42%,#ece4d9)] dark:bg-[radial-gradient(circle_at_top,rgba(226,141,128,0.12),transparent_34%),linear-gradient(180deg,#111315,#16191c_42%,#0e1113)]" />
      <section className="relative w-full max-w-xl rounded-[32px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-8 shadow-[var(--shadow-soft)] backdrop-blur">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">{STUDIO_APP_NAME}</p>
        <h1 className="mt-3 font-serif text-5xl leading-none tracking-tight">Unauthorized</h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[color:var(--muted-foreground)]">
          Your account is signed in, but it does not have permission to enter {STUDIO_APP_NAME}.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[color:var(--muted-foreground)]">
          Access is limited to profiles where <code>is_superadmin</code> or <code>is_matrix_admin</code> is true.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
