import { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";

import {
  isIntroOfferBlockedForUser,
  resolveStoreFreeTrialDisplay,
} from "../../services/payments/introEligibility";

const freeTrialOffer = {
  isFree: true,
  days: 14,
  priceString: "Free",
  periodUnit: "DAY",
  periodNumberOfUnits: 14,
};

describe("isIntroOfferBlockedForUser", () => {
  it("blocks ineligible and no-offer statuses", () => {
    expect(
      isIntroOfferBlockedForUser(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
      ),
    ).toBe(true);
    expect(
      isIntroOfferBlockedForUser(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS,
      ),
    ).toBe(true);
  });

  it("does not block eligible or unknown", () => {
    expect(
      isIntroOfferBlockedForUser(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ),
    ).toBe(false);
    expect(
      isIntroOfferBlockedForUser(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN,
      ),
    ).toBe(false);
  });
});

describe("resolveStoreFreeTrialDisplay", () => {
  it("shows trial when StoreKit marks user eligible", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: null,
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
          description: "eligible",
        } as any,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: true, trialDays: null });
  });

  it("uses intro metadata days when eligible and product exposes intro", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: freeTrialOffer,
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
          description: "eligible",
        } as any,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: true, trialDays: 14 });
  });

  it("hides trial when user is ineligible even if product metadata has intro", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: freeTrialOffer,
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
          description: "ineligible",
        } as any,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: false, trialDays: null });
  });

  it("shows trial when eligibility is unknown", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: null,
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN,
          description: "unknown",
        } as any,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: true, trialDays: null });
  });

  it("uses product intro days when eligibility is unknown", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: freeTrialOffer,
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN,
          description: "unknown",
        } as any,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: true, trialDays: 14 });
  });

  it("shows product intro while eligibility is still loading", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: freeTrialOffer,
        introEligibility: null,
        introEligibilityLoaded: false,
      }),
    ).toEqual({ hasFreeTrial: true, trialDays: 14 });
  });

  it("hides trial after load when eligibility is missing and no product intro", () => {
    expect(
      resolveStoreFreeTrialDisplay({
        trialOffer: null,
        introEligibility: null,
        introEligibilityLoaded: true,
      }),
    ).toEqual({ hasFreeTrial: false, trialDays: null });
  });
});
