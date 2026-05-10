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
      return NextResponse.json(
        {
          error: "unauthorized",
          eventCode: "PROF-401",
          message:
            "צריך להיות מחובר כדי לסנכרן פרופיל. קוד אירוע: PROF-401",
        },
        { status: 401 },
      );
    }

    await upsertAppUserFromAuth(user);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error: "sync_failed",
        eventCode: "PROF-501",
        message:
          "סנכרון הפרופיל נכשל. נסו שוב בעוד רגע. קוד אירוע: PROF-501",
      },
      { status: 500 },
    );
  }
}
