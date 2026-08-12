import type { PurchasesStoreProduct } from "react-native-purchases";

export type StoreProductPricing = {
  price: number;
  priceString: string;
  currencyCode: string;
};

export type StoreProductTrialOffer = {
  /** Free trial when price is 0. */
  isFree: boolean;
  /** Length in days when convertible from store units; otherwise null. */
  days: number | null;
  priceString: string;
  periodUnit: string | null;
  periodNumberOfUnits: number | null;
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

function periodUnitToDays(
  unit: string | null | undefined,
  count: number | null | undefined,
): number | null {
  if (count == null || !Number.isFinite(count) || count <= 0) return null;
  const u = (unit ?? "").trim().toUpperCase();
  if (u === "DAY" || u === "DAYS") return count;
  if (u === "WEEK" || u === "WEEKS") return count * 7;
  if (u === "MONTH" || u === "MONTHS") return count * 30;
  if (u === "YEAR" || u === "YEARS") return count * 365;
  return null;
}

/**
 * Detects a store introductory / free-trial offer for Shop CTA + disclosures.
 * Prefers `introPrice` (iOS / cross-platform); falls back to Android free phase.
 */
export function getStoreProductTrialOffer(
  product: PurchasesStoreProduct | null | undefined,
): StoreProductTrialOffer | null {
  if (!product) return null;

  const intro = product.introPrice;
  if (intro) {
    // Paid intro offers are out of scope for this MVP.
    if (!(typeof intro.price === "number") || intro.price > 0) return null;
    const periodNumberOfUnits = intro.periodNumberOfUnits ?? null;
    const periodUnit = intro.periodUnit ?? null;
    return {
      isFree: true,
      days: periodUnitToDays(periodUnit, periodNumberOfUnits),
      priceString: intro.priceString?.trim() || "Free",
      periodUnit,
      periodNumberOfUnits,
    };
  }

  const freePhase = product.defaultOption?.freePhase;
  if (freePhase?.billingPeriod) {
    const unit = freePhase.billingPeriod.unit ?? null;
    const count = freePhase.billingPeriod.value ?? null;
    return {
      isFree: true,
      days: periodUnitToDays(unit, count),
      priceString: freePhase.price?.formatted?.trim() || "Free",
      periodUnit: unit,
      periodNumberOfUnits: count,
    };
  }

  return null;
}
