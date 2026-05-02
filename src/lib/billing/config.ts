const DEFAULT_PROVIDER = "lemonsqueezy";

export function getBillingProvider(): string {
  return (process.env.BILLING_PROVIDER ?? DEFAULT_PROVIDER).trim().toLowerCase();
}

export function isBillingConfigured(): boolean {
  const provider = getBillingProvider();
  if (provider === "lemonsqueezy") {
    return Boolean(
      process.env.LEMONSQUEEZY_API_KEY &&
        process.env.LEMONSQUEEZY_STORE_ID &&
        process.env.LEMONSQUEEZY_VARIANT_ID &&
        process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    );
  }
  return false;
}
