import { IAP_PRODUCT_IDS } from "../../../shared/payments/iapProducts";
import { getSubscriptionDisclosure } from "../../utils/subscriptionDisclosure";

const t = ((key: string, opts?: { price?: string }) => {
  const map: Record<string, string> = {
    "shop.products.premium_monthly.name": "Premium Monthly",
    "shop.products.premium_yearly.name": "Premium Yearly",
    "shop.products.lifetime.name": "Lifetime Premium",
    "shop.subscriptionPeriod.monthly": "1 month, auto-renewable subscription",
    "shop.subscriptionPeriod.yearly": "1 year, auto-renewable subscription",
    "shop.subscriptionPeriod.lifetime": "One-time purchase (not a subscription)",
    "shop.pricePerMonth": `${opts?.price ?? ""} per month`,
    "shop.billedMonthly": `Billed as ${opts?.price ?? ""} per month`,
  };
  return map[key] ?? key;
}) as any;

describe("getSubscriptionDisclosure", () => {
  it("returns auto-renewable flag for subscriptions", () => {
    const monthly = getSubscriptionDisclosure(IAP_PRODUCT_IDS.monthly, null, t);
    expect(monthly.isAutoRenewable).toBe(true);
    expect(monthly.title).toBe("Premium Monthly");

    const lifetime = getSubscriptionDisclosure(IAP_PRODUCT_IDS.lifetime, null, t);
    expect(lifetime.isAutoRenewable).toBe(false);
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
});
