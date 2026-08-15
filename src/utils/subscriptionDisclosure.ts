import type { TFunction } from "i18next";
import type { PurchasesStoreProduct } from "react-native-purchases";

import {
  getIapProductKind,
  IAP_PRODUCT_NAME_I18N_KEY,
  IAP_SUBSCRIPTION_PERIOD_I18N_KEY,
  isMonthlyIapProduct,
  isSubscriptionIapProduct,
  isYearlyIapProduct,
  type IapProductId,
} from "../../shared/payments/iapProducts";
import {
  formatStoreCurrency,
  getStoreFormattingLocale,
} from "./currencyDisplay";
import { getStoreProductPricing } from "../services/payments/storeProductPricing";

export type SubscriptionDisclosureLines = {
  title: string;
  length: string;
  price: string;
  pricePerUnit: string | null;
  isAutoRenewable: boolean;
};

export function getSubscriptionDisclosure(
  productId: IapProductId,
  product: PurchasesStoreProduct | null | undefined,
  t: TFunction,
): SubscriptionDisclosureLines {
  const kind = getIapProductKind(productId);
  const i18nKey = IAP_PRODUCT_NAME_I18N_KEY[productId];
  const title = t(`shop.products.${i18nKey}.name`);
  const length =
    kind != null
      ? t(`shop.subscriptionPeriod.${IAP_SUBSCRIPTION_PERIOD_I18N_KEY[kind]}`)
      : "";
  const pricing = getStoreProductPricing(product);
  const price = pricing?.priceString?.trim() || "–";
  const isAutoRenewable = isSubscriptionIapProduct(productId);

  let pricePerUnit: string | null = null;
  if (
    isYearlyIapProduct(productId) &&
    pricing != null &&
    pricing.price > 0 &&
    pricing.currencyCode
  ) {
    const perMonth = pricing.price / 12;
    const formatted = formatStoreCurrency(
      perMonth,
      pricing.currencyCode,
      getStoreFormattingLocale(),
    );
    pricePerUnit = t("shop.pricePerMonth", { price: formatted });
  } else if (isMonthlyIapProduct(productId) && price !== "–") {
    pricePerUnit = t("shop.billedMonthly", { price });
  }

  return {
    title,
    length,
    price,
    pricePerUnit,
    isAutoRenewable,
  };
}
