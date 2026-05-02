import { NextResponse } from "next/server";
import { getBillingProvider } from "@/lib/billing/config";
import {
  mapLemonSubscriptionStatus,
  verifyLemonSignature,
} from "@/lib/billing/lemonsqueezy";
import {
  recordWebhookEvent,
  upsertBillingCustomer,
  upsertSubscription,
} from "@/lib/billing/repo";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      customer_id?: number | string;
      user_email?: string;
      status?: string;
      variant_id?: number | string;
      current_period_start?: string | null;
      current_period_end?: string | null;
      cancelled?: boolean;
      cancelled_at?: string | null;
    };
  };
};

export async function POST(request: Request) {
  const provider = getBillingProvider();
  if (provider !== "lemonsqueezy") {
    return NextResponse.json({ error: "provider_not_supported" }, { status: 400 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  const rawPayload = await request.text();
  if (!verifyLemonSignature(rawPayload, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawPayload) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventType = payload.meta?.event_name ?? "unknown";
  const eventId = `${eventType}:${String(payload.data?.id ?? "missing")}`;

  await recordWebhookEvent({
    provider,
    eventId,
    eventType,
    payload: rawPayload,
  });

  const userId = payload.meta?.custom_data?.user_id;
  const subId = payload.data?.id ? String(payload.data.id) : null;
  const customerIdRaw = payload.data?.attributes?.customer_id;
  const customerId = customerIdRaw ? String(customerIdRaw) : null;
  const email = payload.data?.attributes?.user_email ?? null;

  if (!userId || !subId || !customerId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await upsertBillingCustomer({
    userId,
    provider,
    providerCustomerId: customerId,
    email,
  });

  await upsertSubscription({
    customerProviderId: customerId,
    provider,
    providerSubscriptionId: subId,
    status: mapLemonSubscriptionStatus(payload.data?.attributes?.status),
    planId: payload.data?.attributes?.variant_id
      ? String(payload.data.attributes.variant_id)
      : null,
    currentPeriodStart: payload.data?.attributes?.current_period_start
      ? new Date(payload.data.attributes.current_period_start)
      : null,
    currentPeriodEnd: payload.data?.attributes?.current_period_end
      ? new Date(payload.data.attributes.current_period_end)
      : null,
    cancelAtPeriodEnd: Boolean(payload.data?.attributes?.cancelled),
    cancelledAt: payload.data?.attributes?.cancelled_at
      ? new Date(payload.data.attributes.cancelled_at)
      : null,
  });

  return NextResponse.json({ ok: true });
}
