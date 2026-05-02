import { NextResponse } from "next/server";
import { getBillingProvider, isBillingConfigured } from "@/lib/billing/config";
import { getAuthenticatedUser } from "@/lib/billing/auth";
import { createLemonCheckoutUrl } from "@/lib/billing/lemonsqueezy";
import { activateZeroPriceTestSubscription } from "@/lib/billing/repo";
import { activateInMemoryTestEntitlement } from "@/lib/billing/test-mode";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const zeroPriceTestMode =
      process.env.BILLING_ZERO_PRICE_TEST_MODE !== "false";

    if (zeroPriceTestMode) {
      activateInMemoryTestEntitlement(user.id);
      try {
        await activateZeroPriceTestSubscription({
          userId: user.id,
          email: user.email,
        });
      } catch (dbError: unknown) {
        console.error("zero-price test DB activation failed", dbError);
      }
      const res = NextResponse.json({
        checkoutUrl: "/billing?testActivation=1",
        testMode: true,
      });
      res.cookies.set("test_entitlement", user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }

    if (!isBillingConfigured()) {
      return NextResponse.json(
        {
          error: "billing_not_configured",
          message: "מערכת הסליקה עדיין לא הוגדרה.",
        },
        { status: 503 },
      );
    }

    const provider = getBillingProvider();
    if (provider !== "lemonsqueezy") {
      return NextResponse.json(
        {
          error: "provider_not_supported",
          message: `ספק לא נתמך: ${provider}`,
        },
        { status: 400 },
      );
    }

    const checkoutUrl = await createLemonCheckoutUrl({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name as string | undefined,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (error: unknown) {
    console.error("checkout route error", error);
    return NextResponse.json(
      {
        error: "checkout_create_failed",
        message: "לא ניתן להפעיל מנוי כרגע. בדקו הגדרות מסד נתונים וחיוב.",
      },
      { status: 502 },
    );
  }
}
