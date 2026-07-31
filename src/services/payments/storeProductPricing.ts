import type { PurchasesStoreProduct } from "react-native-purchases";

export type StoreProductPricing = {
  price: number;
  priceString: string;
  currencyCode: string;
};

/**
 * Android subs often leave top-level `price` / `priceString` empty;
 * the amount is on `defaultOption.fullPricePhase`.
 */
export function getStoreProductPricing(
  product: PurchasesStoreProduct | null | undefined,
): StoreProductPricing | null {
  if (!product) return null;

  const phasePrice = product.defaultOption?.fullPricePhase?.price;
  const price =
    Number.isFinite(product.price) && product.price > 0
      ? product.price
      : phasePrice != null && phasePrice.amountMicros > 0
        ? phasePrice.amountMicros / 1_000_000
        : null;
  const priceString =
    product.priceString?.trim() || phasePrice?.formatted?.trim() || "";
  const currencyCode =
    product.currencyCode?.trim() || phasePrice?.currencyCode?.trim() || "";

  if ((price == null || price <= 0) && !priceString) return null;

  return {
    price: price ?? 0,
    priceString,
    currencyCode,
  };
}
