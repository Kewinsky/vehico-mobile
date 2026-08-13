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

type PricingPhaseLike = {
  billingPeriod?: { unit?: unknown; value?: number | null; iso8601?: string | null } | null;
  price?: { formatted?: string | null; amountMicros?: number | null } | null;
};

type SubscriptionOptionLike = {
  freePhase?: PricingPhaseLike | null;
  introPhase?: PricingPhaseLike | null;
};

type IntroPriceLike = {
  price?: unknown;
  priceString?: string | null;
  period?: string | null;
  periodUnit?: unknown;
  periodNumberOfUnits?: number | null;
  paymentMode?: unknown;
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

/** StoreKit / Play period units as strings or native enum ints (0 = day). */
function normalizePeriodUnit(unit: unknown): string | null {
  if (typeof unit === "number" && Number.isFinite(unit)) {
    const map = ["DAY", "WEEK", "MONTH", "YEAR"] as const;
    return map[unit] ?? null;
  }
  if (typeof unit === "string" && unit.trim()) {
    return unit.trim().toUpperCase();
  }
  return null;
}

function periodUnitToDays(
  unit: unknown,
  count: number | null | undefined,
): number | null {
  if (count == null || !Number.isFinite(count) || count <= 0) return null;
  const u = normalizePeriodUnit(unit);
  if (u === "DAY" || u === "DAYS") return count;
  if (u === "WEEK" || u === "WEEKS") return count * 7;
  if (u === "MONTH" || u === "MONTHS") return count * 30;
  if (u === "YEAR" || u === "YEARS") return count * 365;
  return null;
}

/** ISO-8601 subscription period from StoreKit (`P14D`, `P2W`, `P1M`). */
function iso8601PeriodToDays(period: string | null | undefined): number | null {
  if (!period) return null;
  const s = period.trim().toUpperCase();
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(s);
  if (!match) return null;
  const years = Number(match[1] ?? 0);
  const months = Number(match[2] ?? 0);
  const weeks = Number(match[3] ?? 0);
  const days = Number(match[4] ?? 0);
  const total = years * 365 + months * 30 + weeks * 7 + days;
  return total > 0 ? total : null;
}

function coercePriceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function looksFreePriceString(priceString: string | null | undefined): boolean {
  const s = (priceString ?? "").trim().toLowerCase();
  if (!s) return false;
  if (s === "free" || s === "gratis") return true;
  return /^(?:0+(?:[.,]0+)?)$/.test(s);
}

function isFreeIntro(intro: IntroPriceLike): boolean {
  // SKProductDiscountPaymentModeFreeTrial = 2
  const mode = intro.paymentMode;
  if (mode === 2 || mode === "FREE_TRIAL" || mode === "FREE") return true;

  const amount = coercePriceAmount(intro.price);
  if (amount != null) return amount <= 0;
  return looksFreePriceString(intro.priceString);
}

function resolveTrialDays(
  periodUnit: unknown,
  periodNumberOfUnits: number | null | undefined,
  periodIso: string | null | undefined,
): number | null {
  return (
    periodUnitToDays(periodUnit, periodNumberOfUnits) ??
    iso8601PeriodToDays(periodIso)
  );
}

function trialFromIntro(intro: IntroPriceLike | null | undefined): StoreProductTrialOffer | null {
  if (!intro || !isFreeIntro(intro)) return null;
  const periodNumberOfUnits = intro.periodNumberOfUnits ?? null;
  const periodUnit = normalizePeriodUnit(intro.periodUnit);
  return {
    isFree: true,
    days: resolveTrialDays(intro.periodUnit, periodNumberOfUnits, intro.period),
    priceString: intro.priceString?.trim() || "Free",
    periodUnit,
    periodNumberOfUnits,
  };
}

function trialFromPhase(phase: PricingPhaseLike | null | undefined): StoreProductTrialOffer | null {
  if (!phase) return null;
  const micros = phase.price?.amountMicros;
  if (typeof micros === "number" && micros > 0) return null;
  const unit = phase.billingPeriod?.unit ?? null;
  const count = phase.billingPeriod?.value ?? null;
  const iso = phase.billingPeriod?.iso8601 ?? null;
  const days = resolveTrialDays(unit, count, iso);
  if (days == null && count == null && !iso) return null;
  return {
    isFree: true,
    days,
    priceString: phase.price?.formatted?.trim() || "Free",
    periodUnit: normalizePeriodUnit(unit),
    periodNumberOfUnits: count,
  };
}

/**
 * Detects a store introductory / free-trial offer for Shop CTA + disclosures.
 * Prefers `introPrice` (iOS / cross-platform); falls back to Android free / intro phases.
 */
export function getStoreProductTrialOffer(
  product: PurchasesStoreProduct | null | undefined,
): StoreProductTrialOffer | null {
  if (!product) return null;

  const fromIntro = trialFromIntro(product.introPrice as IntroPriceLike | null);
  if (fromIntro) return fromIntro;

  const defaultOption = product.defaultOption as SubscriptionOptionLike | undefined;
  const fromDefault =
    trialFromPhase(defaultOption?.freePhase) ??
    trialFromPhase(defaultOption?.introPhase);
  if (fromDefault) return fromDefault;

  const options = (product.subscriptionOptions ?? []) as SubscriptionOptionLike[];
  for (const option of options) {
    const fromOption =
      trialFromPhase(option.freePhase) ?? trialFromPhase(option.introPhase);
    if (fromOption) return fromOption;
  }

  return null;
}

/**
 * Offerings `package.product` can overwrite `getProducts()` and drop `introPrice`.
 * Keep introductory / trial fields from whichever copy still has them.
 */
export function mergeStoreProductsPreservingIntro(
  existing: PurchasesStoreProduct | null | undefined,
  incoming: PurchasesStoreProduct,
): PurchasesStoreProduct {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    introPrice: incoming.introPrice ?? existing.introPrice,
    defaultOption: incoming.defaultOption ?? existing.defaultOption,
    subscriptionOptions:
      incoming.subscriptionOptions?.length
        ? incoming.subscriptionOptions
        : existing.subscriptionOptions,
  };
}
