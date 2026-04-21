"use client";

import { cn } from "@/lib/format";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  showHeaderClose = true,
  closeDisabled = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  showHeaderClose?: boolean;
  closeDisabled?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-4 backdrop-blur-sm sm:py-8"
      onClick={() => {
        if (!closeDisabled) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-6 shadow-[var(--shadow-soft)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
            ) : null}
          </div>
          {showHeaderClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[color:var(--muted-foreground)] disabled:opacity-60"
            >
              Close
            </button>
          ) : null}
        </div>
        <div className={cn("mt-6 min-h-0 overflow-y-auto overscroll-contain pr-1")}>{children}</div>
      </div>
    </div>
  );
}
