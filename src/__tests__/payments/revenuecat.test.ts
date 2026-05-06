import {
  createEmptyRevenueCatProducts,
  findPackageForProductId,
  getPremiumEntitlement,
  isPremiumEntitlementActive,
  isRevenueCatProductId,
  isSubscriptionProduct,
  normalizeProductIdFromRC,
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
} from "../../services/payments/revenuecat";

describe("revenuecat helpers", () => {
  it("createEmptyRevenueCatProducts returns stable keys", () => {
    expect(createEmptyRevenueCatProducts()).toEqual({
      monthly: null,
      yearly: null,
      lifetime: null,
    });
  });

  it("isRevenueCatProductId validates known ids", () => {
    expect(isRevenueCatProductId("monthly")).toBe(true);
    expect(isRevenueCatProductId("yearly")).toBe(true);
    expect(isRevenueCatProductId("lifetime")).toBe(true);
    expect(isRevenueCatProductId("unknown")).toBe(false);
  });

  it("isSubscriptionProduct true only for monthly/yearly", () => {
    expect(isSubscriptionProduct("monthly")).toBe(true);
    expect(isSubscriptionProduct("yearly")).toBe(true);
    expect(isSubscriptionProduct("lifetime")).toBe(false);
  });

  it("normalizeProductIdFromRC maps store identifiers", () => {
    expect(normalizeProductIdFromRC(undefined)).toBeNull();
    expect(normalizeProductIdFromRC("monthly")).toBe("monthly");
    expect(normalizeProductIdFromRC("monthly:base_plan")).toBe("monthly");
    expect(normalizeProductIdFromRC("YEARLY:plan")).toBe("yearly");
    expect(normalizeProductIdFromRC("com.app.lifetime_unlock")).toBe("lifetime");
    expect(normalizeProductIdFromRC("other")).toBeNull();
  });

  it("getPremiumEntitlement pulls active entitlement by id", () => {
    const customerInfo = {
      entitlements: {
        active: {
          [REVENUECAT_PREMIUM_ENTITLEMENT_ID]: { isActive: true },
        },
      },
    } as any;
    expect(getPremiumEntitlement(customerInfo)?.isActive).toBe(true);
    expect(isPremiumEntitlementActive(customerInfo)).toBe(true);
    expect(isPremiumEntitlementActive(null)).toBe(false);
  });

  it("findPackageForProductId finds a package by product identifier", () => {
    const offering = {
      availablePackages: [
        { product: { identifier: "monthly" } },
        { product: { identifier: "yearly" } },
      ],
    } as any;
    expect(findPackageForProductId(offering, "yearly")?.product.identifier).toBe(
      "yearly",
    );
    expect(findPackageForProductId(offering, "lifetime")).toBeNull();
  });
});

