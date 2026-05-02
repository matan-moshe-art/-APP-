import { upsertAppUserFromAuth } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    await upsertAppUserFromAuth(user);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
