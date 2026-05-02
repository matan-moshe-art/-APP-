import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/billing/auth";
import { getUserSubscription, isStatusEntitled } from "@/lib/billing/repo";
import { hasInMemoryTestEntitlement } from "@/lib/billing/test-mode";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const testEntitled = hasInMemoryTestEntitlement(user.id);
    let cookieEntitled = false;
    try {
      const store = await cookies();
      cookieEntitled = store.get("test_entitlement")?.value === user.id;
    } catch {
      /* no cookie store available */
    }
    const subscription = await getUserSubscription(user.id);
    const entitled =
      testEntitled ||
      cookieEntitled ||
      (subscription ? isStatusEntitled(subscription.status) : false);

    const responseSubscription =
      subscription ??
      (testEntitled || cookieEntitled
        ? {
            status: "active",
            provider: "internal_test",
            planId: "zero-price-test-plan",
            currentPeriodEnd: null,
          }
        : null);

    return NextResponse.json({
      entitled,
      subscription: responseSubscription,
    });
  } catch (error: unknown) {
    console.error("subscription route error", error);

    const testEntitled = hasInMemoryTestEntitlement(user.id);
    let cookieEntitledFallback = false;
    try {
      const store = await cookies();
      cookieEntitledFallback =
        store.get("test_entitlement")?.value === user.id;
    } catch {
      /* no cookie store */
    }

    if (testEntitled || cookieEntitledFallback) {
      return NextResponse.json({
        entitled: true,
        subscription: {
          status: "active",
          provider: "internal_test",
          planId: "zero-price-test-plan",
          currentPeriodEnd: null,
        },
      });
    }

    return NextResponse.json(
      {
        error: "billing_status_unavailable",
        message: "לא ניתן לטעון כרגע את סטטוס המנוי.",
      },
      { status: 503 },
    );
  }
}
