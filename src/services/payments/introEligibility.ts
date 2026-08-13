import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  type IntroEligibility,
} from "react-native-purchases";

import {
  IAP_SUBSCRIPTION_PRODUCT_IDS,
  type IapProductId,
  isSubscriptionIapProduct,
  normalizeIapProductId,
} from "../../../shared/payments/iapProducts";

export type IntroEligibilityByProductId = Partial<
  Record<IapProductId, IntroEligibility | null>
>;

export function shouldShowStoreFreeTrialForEligibility(
  status: INTRO_ELIGIBILITY_STATUS | null | undefined,
): boolean {
  return (
    status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ||
    // iOS often returns UNKNOWN while the payment sheet still applies the ASC
    // intro. Prefer matching the sheet over hiding trial copy.
    status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN
  );
}

/**
 * iOS: uses local receipt / StoreKit. Android: typically UNKNOWN.
 * Safe to call for monthly/yearly only.
 */
export async function fetchSubscriptionIntroEligibility(): Promise<IntroEligibilityByProductId> {
  const productIds = [...IAP_SUBSCRIPTION_PRODUCT_IDS];
  try {
    const result =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    const mapped: IntroEligibilityByProductId = {};
    for (const [rawId, eligibility] of Object.entries(result)) {
      const id = normalizeIapProductId(rawId);
      if (!id || !isSubscriptionIapProduct(id)) continue;
      mapped[id] = eligibility;
    }
    return mapped;
  } catch (error) {
    console.warn("Failed to check intro eligibility:", error);
    return {};
  }
}
