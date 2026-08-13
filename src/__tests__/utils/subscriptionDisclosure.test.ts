import { IAP_PRODUCT_IDS } from "../../../shared/payments/iapProducts";
import { INTRO_ELIGIBILITY_STATUS } from "react-native-purchases";
import { getSubscriptionDisclosure } from "../../utils/subscriptionDisclosure";

const t = ((key: string, opts?: { price?: string; days?: number }) => {
  const map: Record<string, string> = {
    "shop.products.premium_monthly.name": "Premium Monthly",
    "shop.products.premium_yearly.name": "Premium Yearly",
    "shop.products.lifetime.name": "Lifetime Premium",
    "shop.subscriptionPeriod.monthly": "1 month, auto-renewable subscription",
    "shop.subscriptionPeriod.yearly": "1 year, auto-renewable subscription",
    "shop.subscriptionPeriod.lifetime": "One-time purchase (not a subscription)",
    "shop.pricePerMonth": `${opts?.price ?? ""} per month`,
    "shop.billedMonthly": `Billed as ${opts?.price ?? ""} per month`,
    "shop.trialThenPrice": `${opts?.days ?? ""}-day free trial, then ${opts?.price ?? ""}`,
    "shop.trialThenPriceUnknownDays": `Free trial, then ${opts?.price ?? ""}`,
  };
  return map[key] ?? key;
}) as any;

describe("getSubscriptionDisclosure", () => {
  it("returns auto-renewable flag for subscriptions", () => {
    const monthly = getSubscriptionDisclosure(IAP_PRODUCT_IDS.monthly, null, t);
    expect(monthly.isAutoRenewable).toBe(true);
    expect(monthly.title).toBe("Premium Monthly");
    expect(monthly.hasFreeTrial).toBe(false);

    const lifetime = getSubscriptionDisclosure(IAP_PRODUCT_IDS.lifetime, null, t);
    expect(lifetime.isAutoRenewable).toBe(false);
  });

  it("surfaces free trial offer line when introPrice is free", () => {
    const monthly = getSubscriptionDisclosure(
      IAP_PRODUCT_IDS.monthly,
      {
        priceString: "29,99 zł",
        price: 29.99,
        currencyCode: "PLN",
        introPrice: {
          price: 0,
          priceString: "Free",
          cycles: 1,
          period: "P14D",
          periodUnit: "DAY",
          periodNumberOfUnits: 14,
        },
      } as any,
      t,
    );
    expect(monthly.hasFreeTrial).toBe(true);
    expect(monthly.trialDays).toBe(14);
    expect(monthly.trialOfferLine).toContain("14");
    expect(monthly.trialOfferLine).toContain("29,99 zł");
  });

  it("shows trial from intro eligibility when introPrice is missing", () => {
    const yearly = getSubscriptionDisclosure(
      IAP_PRODUCT_IDS.yearly,
      {
        priceString: "119,99 zł",
        price: 119.99,
        currencyCode: "PLN",
        introPrice: null,
      } as any,
      t,
      {
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
          description: "eligible",
        } as any,
      },
    );
    expect(yearly.hasFreeTrial).toBe(true);
    expect(yearly.trialDays).toBe(14);
    expect(yearly.trialOfferLine).toContain("14-day free trial");
  });

  it("hides trial when intro eligibility is ineligible", () => {
    const yearly = getSubscriptionDisclosure(
      IAP_PRODUCT_IDS.yearly,
      {
        priceString: "119,99 zł",
        price: 119.99,
        currencyCode: "PLN",
        introPrice: null,
      } as any,
      t,
      {
        introEligibility: {
          status: INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
          description: "ineligible",
        } as any,
      },
    );
    expect(yearly.hasFreeTrial).toBe(false);
    expect(yearly.trialOfferLine).toBeNull();
  });

  it("computes yearly price per month when product price is available", () => {
    const yearly = getSubscriptionDisclosure(
      IAP_PRODUCT_IDS.yearly,
      {
        priceString: "119,99 zł",
        price: 119.99,
        currencyCode: "PLN",
      } as any,
      t,
    );
    expect(yearly.pricePerUnit).toContain("per month");
  });

  it("falls back to Android fullPricePhase when top-level price is empty", () => {
    const yearly = getSubscriptionDisclosure(
      IAP_PRODUCT_IDS.yearly,
      {
        price: 0,
        priceString: "",
        currencyCode: "",
        defaultOption: {
          fullPricePhase: {
            price: {
              amountMicros: 119_990_000,
              formatted: "119,99 zł",
              currencyCode: "PLN",
            },
          },
        },
      } as any,
      t,
    );
    expect(yearly.price).toBe("119,99 zł");
    expect(yearly.pricePerUnit).toContain("per month");
  });
});
