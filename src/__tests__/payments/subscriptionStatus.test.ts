import {
  buildSubscriptionStatusSnapshot,
  daysUntilIso,
  isTrialPeriodType,
  shouldShowPremiumEndingBanner,
} from "../../services/payments/subscriptionStatus";
import { getStoreProductTrialOffer } from "../../services/payments/storeProductPricing";

describe("subscriptionStatus", () => {
  it("detects trial period types case-insensitively", () => {
    expect(isTrialPeriodType("TRIAL")).toBe(true);
    expect(isTrialPeriodType("trial")).toBe(true);
    expect(isTrialPeriodType("NORMAL")).toBe(false);
    expect(isTrialPeriodType(null)).toBe(false);
  });

  it("computes whole days until expiry", () => {
    const now = Date.parse("2026-08-12T10:00:00.000Z");
    expect(daysUntilIso("2026-08-12T18:00:00.000Z", now)).toBe(1);
    expect(daysUntilIso("2026-08-15T10:00:00.000Z", now)).toBe(3);
    expect(daysUntilIso("2026-08-12T08:00:00.000Z", now)).toBe(0);
  });

  it("shows banner for trial within 3 days", () => {
    expect(
      shouldShowPremiumEndingBanner({
        isPremium: true,
        isLifetime: false,
        isTrial: true,
        willRenew: true,
        daysUntilExpiry: 3,
      }),
    ).toBe(true);
    expect(
      shouldShowPremiumEndingBanner({
        isPremium: true,
        isLifetime: false,
        isTrial: true,
        willRenew: true,
        daysUntilExpiry: 4,
      }),
    ).toBe(false);
  });

  it("shows banner for cancelled subscription within 7 days", () => {
    expect(
      shouldShowPremiumEndingBanner({
        isPremium: true,
        isLifetime: false,
        isTrial: false,
        willRenew: false,
        daysUntilExpiry: 7,
      }),
    ).toBe(true);
    expect(
      shouldShowPremiumEndingBanner({
        isPremium: true,
        isLifetime: false,
        isTrial: false,
        willRenew: true,
        daysUntilExpiry: 2,
      }),
    ).toBe(false);
  });

  it("builds trial snapshot from RC entitlement fields", () => {
    const snap = buildSubscriptionStatusSnapshot({
      isPremium: true,
      isLifetime: false,
      periodType: "TRIAL",
      willRenew: true,
      entitlementExpirationDate: "2026-08-14T12:00:00.000Z",
      premiumUntilDb: "2026-08-20T12:00:00.000Z",
      nowMs: Date.parse("2026-08-12T12:00:00.000Z"),
    });
    expect(snap.isTrial).toBe(true);
    expect(snap.willRenew).toBe(true);
    expect(snap.premiumExpiresAt).toBe("2026-08-14T12:00:00.000Z");
    expect(snap.daysUntilPremiumExpiry).toBe(2);
    expect(snap.showPremiumEndingBanner).toBe(true);
    expect(snap.premiumEndingKind).toBe("trial");
  });
});

describe("getStoreProductTrialOffer", () => {
  it("reads free introPrice", () => {
    const offer = getStoreProductTrialOffer({
      price: 29.99,
      priceString: "29,99 zł",
      currencyCode: "PLN",
      introPrice: {
        price: 0,
        priceString: "Free",
        cycles: 1,
        period: "P14D",
        periodUnit: "DAY",
        periodNumberOfUnits: 14,
      },
    } as any);
    expect(offer).toEqual({
      isFree: true,
      days: 14,
      priceString: "Free",
      periodUnit: "DAY",
      periodNumberOfUnits: 14,
    });
  });

  it("ignores paid intro offers", () => {
    expect(
      getStoreProductTrialOffer({
        introPrice: {
          price: 1.99,
          priceString: "1,99 zł",
          cycles: 1,
          period: "P1M",
          periodUnit: "MONTH",
          periodNumberOfUnits: 1,
        },
      } as any),
    ).toBeNull();
  });

  it("falls back to Android freePhase", () => {
    const offer = getStoreProductTrialOffer({
      price: 0,
      priceString: "",
      currencyCode: "",
      defaultOption: {
        freePhase: {
          billingPeriod: { unit: "DAY", value: 14, iso8601: "P14D" },
          price: { formatted: "Free", amountMicros: 0, currencyCode: "PLN" },
        },
        fullPricePhase: {
          price: {
            amountMicros: 29_990_000,
            formatted: "29,99 zł",
            currencyCode: "PLN",
          },
        },
      },
    } as any);
    expect(offer?.days).toBe(14);
    expect(offer?.isFree).toBe(true);
  });
});
