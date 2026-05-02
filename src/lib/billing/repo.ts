import { SubscriptionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/db";

type UpsertCustomerInput = {
  userId: string;
  email?: string | null;
  provider: string;
  providerCustomerId: string;
};

type UpsertSubscriptionInput = {
  customerProviderId: string;
  provider: string;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  planId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: Date | null;
};

export async function upsertBillingCustomer(input: UpsertCustomerInput) {
  const prisma = getPrisma();
  if (!prisma) return null;

  return prisma.billingCustomer.upsert({
    where: { providerCustomerId: input.providerCustomerId },
    create: {
      userId: input.userId,
      email: input.email ?? null,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
    },
    update: {
      email: input.email ?? null,
      userId: input.userId,
    },
  });
}

export async function upsertSubscription(input: UpsertSubscriptionInput) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const customer = await prisma.billingCustomer.findUnique({
    where: { providerCustomerId: input.customerProviderId },
    select: { id: true },
  });
  if (!customer) return null;

  return prisma.subscription.upsert({
    where: { providerSubscriptionId: input.providerSubscriptionId },
    create: {
      customerId: customer.id,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      status: input.status,
      planId: input.planId ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      cancelledAt: input.cancelledAt ?? null,
    },
    update: {
      status: input.status,
      planId: input.planId ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      cancelledAt: input.cancelledAt ?? null,
    },
  });
}

export async function recordWebhookEvent(input: {
  provider: string;
  eventId: string;
  eventType: string;
  payload: string;
  processingNote?: string;
}) {
  const prisma = getPrisma();
  if (!prisma) return null;

  return prisma.billingWebhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: input.provider,
        eventId: input.eventId,
      },
    },
    create: {
      provider: input.provider,
      eventId: input.eventId,
      eventType: input.eventType,
      payload: input.payload,
      processingNote: input.processingNote,
    },
    update: {
      eventType: input.eventType,
      payload: input.payload,
      processingNote: input.processingNote,
    },
  });
}

export async function getUserSubscription(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.subscription.findFirst({
    where: {
      customer: { userId },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function isStatusEntitled(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export async function activateZeroPriceTestSubscription(input: {
  userId: string;
  email?: string | null;
}) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const customer = await prisma.billingCustomer.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      email: input.email ?? null,
      provider: "internal_test",
      providerCustomerId: `test-customer-${input.userId}`,
    },
    update: {
      email: input.email ?? null,
      provider: "internal_test",
      providerCustomerId: `test-customer-${input.userId}`,
    },
  });

  return prisma.subscription.upsert({
    where: { providerSubscriptionId: `test-subscription-${input.userId}` },
    create: {
      customerId: customer.id,
      provider: "internal_test",
      providerSubscriptionId: `test-subscription-${input.userId}`,
      status: "active",
      planId: "zero-price-test-plan",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
    update: {
      status: "active",
      planId: "zero-price-test-plan",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
  });
}

export async function cancelZeroPriceTestSubscription(userId: string) {
  const prisma = getPrisma();
  if (!prisma) return null;

  return prisma.subscription.updateMany({
    where: {
      provider: "internal_test",
      customer: { userId },
      status: { in: ["active", "trialing"] },
    },
    data: {
      status: "canceled",
      cancelAtPeriodEnd: false,
      cancelledAt: new Date(),
      currentPeriodEnd: new Date(),
    },
  });
}
