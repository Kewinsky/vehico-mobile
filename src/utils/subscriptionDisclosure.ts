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
  const price = product?.priceString?.trim() || "–";
  const isAutoRenewable = isSubscriptionIapProduct(productId);

  let pricePerUnit: string | null = null;
  if (
    isYearlyIapProduct(productId) &&
    product?.price != null &&
    product.price > 0 &&
    product.currencyCode
  ) {
    const perMonth = product.price / 12;
    const formatted = formatStoreCurrency(
      perMonth,
      product.currencyCode,
      getStoreFormattingLocale(),
    );
    pricePerUnit = t("shop.pricePerMonth", { price: formatted });
  } else if (isMonthlyIapProduct(productId) && price !== "–") {
    pricePerUnit = t("shop.billedMonthly", { price });
  }

  return { title, length, price, pricePerUnit, isAutoRenewable };
}
