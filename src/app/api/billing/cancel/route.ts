import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/billing/auth";
import { cancelZeroPriceTestSubscription } from "@/lib/billing/repo";
import { deactivateInMemoryTestEntitlement } from "@/lib/billing/test-mode";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const zeroPriceTestMode = process.env.BILLING_ZERO_PRICE_TEST_MODE !== "false";
  if (!zeroPriceTestMode) {
    return NextResponse.json(
      {
        error: "cancel_not_available",
        message: "ביטול מנוי זמין כרגע דרך פורטל הסליקה בלבד.",
      },
      { status: 409 },
    );
  }

  deactivateInMemoryTestEntitlement(user.id);
  try {
    await cancelZeroPriceTestSubscription(user.id);
  } catch (error: unknown) {
    console.error("zero-price test cancel DB update failed", error);
  }

  const res = NextResponse.json({
    canceled: true,
    message: "המנוי בוטל בהצלחה במסלול הבדיקה.",
  });
  res.cookies.delete("test_entitlement");
  return res;
}
