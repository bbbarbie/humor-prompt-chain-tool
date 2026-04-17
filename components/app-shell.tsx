import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { STUDIO_APP_NAME } from "@/lib/navigation";

export function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--glow),transparent_32%),radial-gradient(circle_at_bottom_right,var(--glow-secondary),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 md:px-6 md:py-6">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-7">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-foreground)]">
                HF
              </span>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted-foreground)]">
                  Humor Flavor Studio
                </p>
                <h1 className="font-serif text-2xl tracking-tight">{STUDIO_APP_NAME}</h1>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
            >
              Dashboard
            </Link>
            <Link
              href="/stats"
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted-foreground)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
            >
              Stats
            </Link>
            {email ? (
              <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted-foreground)]">
                {email}
              </div>
            ) : null}
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
