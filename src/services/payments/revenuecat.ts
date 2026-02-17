import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
} from "react-native-purchases";

import { ENV } from "../../config/env";

export const REVENUECAT_PUBLIC_API_KEY = ENV.REVENUECAT_API_KEY;
export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = "vehico Premium";

export const REVENUECAT_SUBSCRIPTION_PRODUCT_IDS = [
  "monthly",
  "yearly",
] as const;
export const REVENUECAT_NON_SUBSCRIPTION_PRODUCT_IDS = [
  "lifetime",
] as const;
export const REVENUECAT_ALL_PRODUCT_IDS = [
  ...REVENUECAT_SUBSCRIPTION_PRODUCT_IDS,
  ...REVENUECAT_NON_SUBSCRIPTION_PRODUCT_IDS,
] as const;

export type RevenueCatProductId = (typeof REVENUECAT_ALL_PRODUCT_IDS)[number];

export type RevenueCatProductsMap = Record<
  RevenueCatProductId,
  PurchasesStoreProduct | null
>;

export function createEmptyRevenueCatProducts(): RevenueCatProductsMap {
  return {
    monthly: null,
    yearly: null,
    lifetime: null,
  };
}

export function isRevenueCatProductId(
  value: string,
): value is RevenueCatProductId {
  return (REVENUECAT_ALL_PRODUCT_IDS as readonly string[]).includes(value);
}

export function isSubscriptionProduct(productId: RevenueCatProductId): boolean {
  return (REVENUECAT_SUBSCRIPTION_PRODUCT_IDS as readonly string[]).includes(
    productId,
  );
}

export function getPremiumEntitlement(
  customerInfo: CustomerInfo | null,
): PurchasesEntitlementInfo | null {
  return (
    customerInfo?.entitlements?.active?.[REVENUECAT_PREMIUM_ENTITLEMENT_ID] ??
    null
  );
}

export function isPremiumEntitlementActive(
  customerInfo: CustomerInfo | null,
): boolean {
  return getPremiumEntitlement(customerInfo)?.isActive === true;
}

/** Normalize RevenueCat productIdentifier (e.g. "monthly:base_plan") to our product id. */
export function normalizeProductIdFromRC(
  productIdentifier: string | undefined,
): RevenueCatProductId | null {
  if (!productIdentifier) return null;
  const lower = productIdentifier.toLowerCase();
  if (lower === "lifetime" || lower.includes("lifetime")) return "lifetime";
  if (lower === "monthly" || lower.startsWith("monthly")) return "monthly";
  if (lower === "yearly" || lower.startsWith("yearly")) return "yearly";
  return null;
}

export function findPackageForProductId(
  offering: PurchasesOffering | null | undefined,
  productId: RevenueCatProductId,
): PurchasesPackage | null {
  return (
    offering?.availablePackages.find(
      (candidate) => candidate.product.identifier === productId,
    ) ?? null
  );
}
