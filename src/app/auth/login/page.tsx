import { SupabaseMagicLinkForm } from "@/components/auth/SupabaseMagicLinkForm";
import { Suspense } from "react";

export default function AuthLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8">
          <div
            className="size-10 animate-pulse rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 opacity-80"
            aria-hidden
          />
          <span className="sr-only">טוען…</span>
        </div>
      }
    >
      <SupabaseMagicLinkForm />
    </Suspense>
  );
}
