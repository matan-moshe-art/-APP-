import type { ReactNode } from "react";

/** Shared chrome for auth screens (matches landing palette). */
export function AuthFullPageCard({
  children,
  footer,
}: Readonly<{
  children: ReactNode;
  footer?: ReactNode;
}>) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center p-4 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[#050a08]/85"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(22,163,74,0.12),_transparent_55%)]"
        aria-hidden
      />

      <div className="animate-scale-in relative w-full max-w-md sm:max-w-lg">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-2xl shadow-emerald-950/50 ring-1 ring-emerald-500/15 backdrop-blur-xl sm:p-7">
          <div
            className="pointer-events-none absolute -start-24 -top-24 size-48 rounded-full bg-gradient-to-br from-emerald-600/35 to-green-600/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -end-16 size-40 rounded-full bg-gradient-to-br from-teal-500/15 to-emerald-500/20 blur-2xl"
            aria-hidden
          />
          <div className="relative">{children}</div>
        </div>
        {footer ? (
          <div className="relative mt-4 text-center text-xs text-zinc-500">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
