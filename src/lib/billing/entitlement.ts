import { cookies } from "next/headers";
import { getUserSubscription, isStatusEntitled } from "@/lib/billing/repo";
import { hasInMemoryTestEntitlement } from "@/lib/billing/test-mode";

async function hasTestEntitlementCookie(userId: string): Promise<boolean> {
  try {
    const store = await cookies();
    const val = store.get("test_entitlement")?.value;
    return val === userId;
  } catch {
    return false;
  }
}

export async function userHasActiveSubscription(
  userId: string,
): Promise<boolean> {
  if (hasInMemoryTestEntitlement(userId)) {
    return true;
  }
  if (await hasTestEntitlementCookie(userId)) {
    return true;
  }
  try {
    const sub = await getUserSubscription(userId);
    if (!sub) return false;
    return isStatusEntitled(sub.status);
  } catch (error: unknown) {
    console.error("subscription entitlement lookup failed", error);
    return false;
  }
}
