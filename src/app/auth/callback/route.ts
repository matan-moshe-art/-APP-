import { createClient } from "@/lib/supabase/server";
import { upsertAppUserFromAuth } from "@/lib/auth/app-user";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError =
    searchParams.get("error_code") ?? searchParams.get("error");
  const nextRaw = searchParams.get("next");
  const next =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/";

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=link&eventCode=AUTH-302`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await upsertAppUserFromAuth(user);
        }
      } catch {
        // Do not block successful login on profile sync errors.
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=session&eventCode=AUTH-301`,
  );
}
