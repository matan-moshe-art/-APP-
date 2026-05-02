import { createHmac } from "crypto";
import { SubscriptionStatus } from "@prisma/client";

export type LemonCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
};

export function mapLemonSubscriptionStatus(raw: unknown): SubscriptionStatus {
  const value = String(raw ?? "").toLowerCase();
  switch (value) {
    case "active":
      return "active";
    case "on_trial":
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "paused":
      return "paused";
    default:
      return "incomplete";
  }
}

export function verifyLemonSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const digest = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return digest === signature;
}

export async function createLemonCheckoutUrl(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !storeId || !variantId || !appUrl) {
    throw new Error("Missing Lemon Squeezy checkout configuration");
  }

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: { user_id: input.userId },
            email: input.email ?? undefined,
            name: input.name ?? undefined,
          },
          product_options: {
            redirect_url: `${appUrl.replace(/\/+$/, "")}/billing`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Lemon checkout failed ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as LemonCheckoutResponse;
  const url = data?.data?.attributes?.url;
  if (!url) throw new Error("Lemon checkout URL missing in response");
  return url;
}
