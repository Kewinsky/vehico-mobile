import {
  IAP_PRODUCT_IDS,
  IAP_SUBSCRIPTION_PRODUCT_IDS,
} from "../../../shared/payments/iapProducts";
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
      [IAP_PRODUCT_IDS.monthly]: null,
      [IAP_PRODUCT_IDS.yearly]: null,
      [IAP_PRODUCT_IDS.lifetime]: null,
    });
  });

  it("isRevenueCatProductId validates known ids", () => {
    expect(isRevenueCatProductId(IAP_PRODUCT_IDS.monthly)).toBe(true);
    expect(isRevenueCatProductId(IAP_PRODUCT_IDS.yearly)).toBe(true);
    expect(isRevenueCatProductId(IAP_PRODUCT_IDS.lifetime)).toBe(true);
    expect(isRevenueCatProductId("monthly")).toBe(false);
    expect(isRevenueCatProductId("unknown")).toBe(false);
  });

  it("isSubscriptionProduct true only for subscription products", () => {
    expect(isSubscriptionProduct(IAP_PRODUCT_IDS.monthly)).toBe(true);
    expect(isSubscriptionProduct(IAP_PRODUCT_IDS.yearly)).toBe(true);
    expect(isSubscriptionProduct(IAP_PRODUCT_IDS.lifetime)).toBe(false);
    expect(IAP_SUBSCRIPTION_PRODUCT_IDS).toHaveLength(2);
  });

  it("normalizeProductIdFromRC maps store identifiers", () => {
    expect(normalizeProductIdFromRC(undefined)).toBeNull();
    expect(normalizeProductIdFromRC(IAP_PRODUCT_IDS.monthly)).toBe(
      IAP_PRODUCT_IDS.monthly,
    );
    expect(normalizeProductIdFromRC("monthly:base_plan")).toBe(
      IAP_PRODUCT_IDS.monthly,
    );
    expect(normalizeProductIdFromRC("monthly_premium:monthly-premium")).toBe(
      IAP_PRODUCT_IDS.monthly,
    );
    expect(normalizeProductIdFromRC("yearly_premium:yearly-premium")).toBe(
      IAP_PRODUCT_IDS.yearly,
    );
    expect(normalizeProductIdFromRC("YEARLY:plan")).toBe(IAP_PRODUCT_IDS.yearly);
    expect(normalizeProductIdFromRC("com.app.lifetime_unlock")).toBe(
      IAP_PRODUCT_IDS.lifetime,
    );
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
        { product: { identifier: IAP_PRODUCT_IDS.monthly } },
        { product: { identifier: IAP_PRODUCT_IDS.yearly } },
      ],
    } as any;
    expect(
      findPackageForProductId(offering, IAP_PRODUCT_IDS.yearly)?.product
        .identifier,
    ).toBe(IAP_PRODUCT_IDS.yearly);
    expect(findPackageForProductId(offering, IAP_PRODUCT_IDS.lifetime)).toBeNull();
  });

  it("findPackageForProductId matches Android productId:basePlanId", () => {
    const offering = {
      availablePackages: [
        { product: { identifier: "monthly_premium:monthly-premium" } },
        { product: { identifier: "yearly_premium:yearly-premium" } },
      ],
    } as any;
    expect(
      findPackageForProductId(offering, IAP_PRODUCT_IDS.monthly)?.product
        .identifier,
    ).toBe("monthly_premium:monthly-premium");
    expect(
      findPackageForProductId(offering, IAP_PRODUCT_IDS.yearly)?.product
        .identifier,
    ).toBe("yearly_premium:yearly-premium");
  });
});
