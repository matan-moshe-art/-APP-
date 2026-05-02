import { createBrowserClient } from "@supabase/ssr";
import { resolveSupabaseClientKey } from "./env";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = resolveSupabaseClientKey();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a client key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }
  return createBrowserClient(url, key);
}
