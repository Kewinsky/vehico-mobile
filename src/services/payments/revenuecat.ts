import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
} from "react-native-purchases";

import { ENV } from "../../config/env";
import type { IapProductId } from "../../../shared/payments/iapProducts";

export {
  IAP_ALL_PRODUCT_IDS as REVENUECAT_ALL_PRODUCT_IDS,
  IAP_DEFAULT_SUBSCRIPTION as REVENUECAT_DEFAULT_SUBSCRIPTION,
  IAP_ONE_TIME_PRODUCT_IDS as REVENUECAT_NON_SUBSCRIPTION_PRODUCT_IDS,
  IAP_PLAN_ORDER as REVENUECAT_PLAN_ORDER,
  IAP_PRODUCT_IDS as REVENUECAT_PRODUCT_IDS,
  IAP_SUBSCRIPTION_PRODUCT_IDS as REVENUECAT_SUBSCRIPTION_PRODUCT_IDS,
  createEmptyIapProductsMap as createEmptyRevenueCatProducts,
  isIapProductId as isRevenueCatProductId,
  isSubscriptionIapProduct as isSubscriptionProduct,
  isLifetimeIapProduct as isLifetimeProduct,
  isMonthlyIapProduct as isMonthlyProduct,
  isYearlyIapProduct as isYearlyProduct,
  normalizeIapProductId as normalizeProductIdFromRC,
  type IapProductId as RevenueCatProductId,
  type IapProductKind as RevenueCatProductKind,
} from "../../../shared/payments/iapProducts";

export const REVENUECAT_PUBLIC_API_KEY = ENV.REVENUECAT_API_KEY;
export const REVENUECAT_PREMIUM_ENTITLEMENT_ID = "vehico Premium";

export type RevenueCatProductsMap = Record<
  IapProductId,
  PurchasesStoreProduct | null
>;

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

export function findPackageForProductId(
  offering: PurchasesOffering | null | undefined,
  productId: IapProductId,
): PurchasesPackage | null {
  return (
    offering?.availablePackages.find(
      (candidate) => candidate.product.identifier === productId,
    ) ?? null
  );
}
