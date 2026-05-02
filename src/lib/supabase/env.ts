/**
 * Browser-safe Supabase key: legacy `anon` JWT or newer `publishable` key name.
 */
export function resolveSupabaseClientKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseClientEnvConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && resolveSupabaseClientKey(),
  );
}
