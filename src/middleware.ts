import { createServerClient } from "@supabase/ssr";
import {
  isSupabaseClientEnvConfigured,
  resolveSupabaseClientKey,
} from "@/lib/supabase/env";
import { NextResponse, type NextRequest } from "next/server";

function isSupabaseConfigured(): boolean {
  return isSupabaseClientEnvConfigured();
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return true;
  if (pathname === "/api/analyze/callback") return true;
  if (pathname === "/api/billing/webhook") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    if (pathname.startsWith("/auth")) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveSupabaseClientKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (user && pathname.startsWith("/auth/login")) {
    const next = request.nextUrl.searchParams.get("next");
    const safe =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const url = request.nextUrl.clone();
    url.pathname = safe;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const destination =
      request.nextUrl.pathname + (request.nextUrl.search || "");
    url.searchParams.set(
      "next",
      destination.startsWith("/auth") ? "/" : destination,
    );
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
