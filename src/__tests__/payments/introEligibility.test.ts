import { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";

import { shouldShowStoreFreeTrialForEligibility } from "../../services/payments/introEligibility";

describe("shouldShowStoreFreeTrialForEligibility", () => {
  it("shows trial for eligible and unknown", () => {
    expect(
      shouldShowStoreFreeTrialForEligibility(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
      ),
    ).toBe(true);
    expect(
      shouldShowStoreFreeTrialForEligibility(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN,
      ),
    ).toBe(true);
  });

  it("hides trial for ineligible / no offer", () => {
    expect(
      shouldShowStoreFreeTrialForEligibility(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
      ),
    ).toBe(false);
    expect(
      shouldShowStoreFreeTrialForEligibility(
        INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS,
      ),
    ).toBe(false);
    expect(shouldShowStoreFreeTrialForEligibility(null)).toBe(false);
  });
});
