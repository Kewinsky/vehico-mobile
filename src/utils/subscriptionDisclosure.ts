import type { TFunction } from "i18next";
import type { PurchasesStoreProduct } from "react-native-purchases";

import type { RevenueCatProductId } from "../services/payments/revenuecat";
import { isSubscriptionProduct } from "../services/payments/revenuecat";

const PRODUCT_I18N_KEY: Record<RevenueCatProductId, string> = {
  monthly: "premium_monthly",
  yearly: "premium_yearly",
  lifetime: "lifetime",
};

export type SubscriptionDisclosureLines = {
  title: string;
  length: string;
  price: string;
  pricePerUnit: string | null;
  isAutoRenewable: boolean;
};

export function getSubscriptionDisclosure(
  productId: RevenueCatProductId,
  product: PurchasesStoreProduct | null | undefined,
  t: TFunction,
): SubscriptionDisclosureLines {
  const i18nKey = PRODUCT_I18N_KEY[productId];
  const title = t(`shop.products.${i18nKey}.name`);
  const length = t(`shop.subscriptionPeriod.${productId}`);
  const price = product?.priceString?.trim() || "—";
  const isAutoRenewable = isSubscriptionProduct(productId);

  let pricePerUnit: string | null = null;
  if (productId === "yearly" && product?.price != null && product.price > 0) {
    const perMonth = product.price / 12;
    const formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: product.currencyCode ?? "PLN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(perMonth);
    pricePerUnit = t("shop.pricePerMonth", { price: formatted });
  } else if (productId === "monthly" && price !== "—") {
    pricePerUnit = t("shop.billedMonthly", { price });
  }

  return { title, length, price, pricePerUnit, isAutoRenewable };
}
