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
import type { StoreProductTrialOffer } from "./storeProductPricing";

export type IntroEligibilityByProductId = Partial<
  Record<IapProductId, IntroEligibility | null>
>;

export type StoreFreeTrialDisplay = {
  hasFreeTrial: boolean;
  trialDays: number | null;
};

/** StoreKit says the user cannot receive an intro for this product. */
export function isIntroOfferBlockedForUser(
  status: INTRO_ELIGIBILITY_STATUS | null | undefined,
): boolean {
  return (
    status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ||
    status ===
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS
  );
}

/**
 * Align Shop trial copy with the native payment sheet (StoreKit / Play Billing).
 *
 * Same rules on iOS and Android:
 * 1. Block when eligibility is INELIGIBLE or NO_INTRO_OFFER_EXISTS.
 * 2. Show when ELIGIBLE or UNKNOWN (UNKNOWN = not enough local data; the native
 *    sheet still typically applies a store intro for a new store account).
 * 3. While eligibility is still loading, show trial only when product metadata exposes it.
 */
export function resolveStoreFreeTrialDisplay(options: {
  trialOffer: StoreProductTrialOffer | null;
  introEligibility?: IntroEligibility | null;
  introEligibilityLoaded?: boolean;
}): StoreFreeTrialDisplay {
  const {
    trialOffer,
    introEligibility,
    introEligibilityLoaded = false,
  } = options;
  const status = introEligibility?.status;
  const hasStoreIntro = trialOffer?.isFree === true;

  if (isIntroOfferBlockedForUser(status)) {
    return { hasFreeTrial: false, trialDays: null };
  }

  if (
    status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ||
    status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN
  ) {
    return {
      hasFreeTrial: true,
      trialDays: trialOffer?.days ?? null,
    };
  }

  if (!introEligibilityLoaded) {
    return {
      hasFreeTrial: hasStoreIntro,
      trialDays: hasStoreIntro ? (trialOffer?.days ?? null) : null,
    };
  }

  return { hasFreeTrial: false, trialDays: null };
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
