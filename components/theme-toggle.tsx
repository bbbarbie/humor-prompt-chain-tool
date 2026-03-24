"use client";

import { useTheme, type ThemeMode } from "@/components/theme-provider";
import { cn } from "@/lib/format";

const OPTIONS: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] p-1 shadow-[var(--shadow-soft)] backdrop-blur">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] transition",
            theme === option
              ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
              : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
