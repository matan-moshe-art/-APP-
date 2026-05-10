import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/config";
import { getAuthenticatedUser } from "@/lib/billing/auth";
import { debugLog } from "@/lib/billing/debug-log";

export async function POST() {
  // #region agent log
  debugLog({
    runId: "initial-debug-1",
    hypothesisId: "H3",
    location: "src/app/api/billing/portal/route.ts:POST:start",
    message: "Portal route invoked",
    data: {
      provider: getBillingProvider(),
      hasPortalUrl: Boolean(process.env.LEMONSQUEEZY_CUSTOMER_PORTAL_URL),
    },
  });
  // #endregion

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "unauthorized",
        eventCode: "BILL-404",
        message:
          "צריך להיות מחובר כדי לפתוח את ניהול המנוי. קוד אירוע: BILL-404",
      },
      { status: 401 },
    );
  }

  const provider = getBillingProvider();
  if (provider === "lemonsqueezy") {
    const zeroPriceTestMode = process.env.BILLING_ZERO_PRICE_TEST_MODE !== "false";
    if (!process.env.LEMONSQUEEZY_CUSTOMER_PORTAL_URL) {
      if (zeroPriceTestMode) {
        return NextResponse.json({
          url: "/billing",
          testMode: true,
          message: "במסלול בדיקה אין פורטל חיצוני. ניהול המנוי מתבצע כאן בעמוד.",
        });
      }
      return NextResponse.json(
        {
          error: "portal_not_configured",
          eventCode: "BILL-302",
          message:
            "ניהול מנוי אינו זמין כרגע. קוד אירוע: BILL-302",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({
      url: process.env.LEMONSQUEEZY_CUSTOMER_PORTAL_URL,
    });
  }

  return NextResponse.json(
    {
      error: "provider_not_supported",
      eventCode: "BILL-103",
      message: `ספק חיוב לא נתמך: ${provider}. קוד אירוע: BILL-103`,
    },
    { status: 400 },
  );
}
