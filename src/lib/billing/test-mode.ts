const activatedUsers = new Set<string>();

function isZeroPriceTestModeEnabled(): boolean {
  return process.env.BILLING_ZERO_PRICE_TEST_MODE !== "false";
}

export function activateInMemoryTestEntitlement(userId: string): boolean {
  if (!isZeroPriceTestModeEnabled()) return false;
  activatedUsers.add(userId);
  return true;
}

export function hasInMemoryTestEntitlement(userId: string): boolean {
  if (!isZeroPriceTestModeEnabled()) return false;
  return activatedUsers.has(userId);
}

export function deactivateInMemoryTestEntitlement(userId: string): boolean {
  if (!isZeroPriceTestModeEnabled()) return false;
  return activatedUsers.delete(userId);
}
