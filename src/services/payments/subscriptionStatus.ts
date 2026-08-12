/**
 * Client-side Premium / trial status helpers (RevenueCat + DB expiry).
 * No DB schema required – trial is detected from RC `periodType`.
 */

export type PremiumEndingKind = "trial" | "subscription";

/** Show trial-ending UI within this many days (inclusive). */
export const PREMIUM_TRIAL_ENDING_SOON_DAYS = 3;
/** Show cancelled-subscription ending UI within this many days (inclusive). */
export const PREMIUM_SUBSCRIPTION_ENDING_SOON_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isTrialPeriodType(
  periodType: string | null | undefined,
): boolean {
  return (periodType ?? "").trim().toUpperCase() === "TRIAL";
}

export function resolvePremiumExpirationIso(input: {
  entitlementExpirationDate?: string | null;
  premiumUntilDb?: string | null;
}): string | null {
  const fromRc = input.entitlementExpirationDate?.trim() || null;
  if (fromRc) {
    const ms = Date.parse(fromRc);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  const fromDb = input.premiumUntilDb?.trim() || null;
  if (fromDb) {
    const ms = Date.parse(fromDb);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return null;
}

/** Whole calendar days remaining until expiry (0 = today / overdue). */
export function daysUntilIso(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!iso) return null;
  const targetMs = Date.parse(iso);
  if (!Number.isFinite(targetMs)) return null;
  const diff = targetMs - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

export function shouldShowPremiumEndingBanner(input: {
  isPremium: boolean;
  isLifetime: boolean;
  isTrial: boolean;
  willRenew: boolean | null;
  daysUntilExpiry: number | null;
}): boolean {
  if (!input.isPremium || input.isLifetime) return false;
  if (input.daysUntilExpiry == null) return false;

  if (input.isTrial) {
    return input.daysUntilExpiry <= PREMIUM_TRIAL_ENDING_SOON_DAYS;
  }

  // Paid period: warn only when access will actually end (cancelled / won't renew).
  if (input.willRenew === false) {
    return input.daysUntilExpiry <= PREMIUM_SUBSCRIPTION_ENDING_SOON_DAYS;
  }

  return false;
}

export function resolvePremiumEndingKind(input: {
  isTrial: boolean;
  showBanner: boolean;
}): PremiumEndingKind | null {
  if (!input.showBanner) return null;
  return input.isTrial ? "trial" : "subscription";
}

export type SubscriptionStatusSnapshot = {
  isTrial: boolean;
  willRenew: boolean | null;
  premiumExpiresAt: string | null;
  daysUntilPremiumExpiry: number | null;
  showPremiumEndingBanner: boolean;
  premiumEndingKind: PremiumEndingKind | null;
};

export function buildSubscriptionStatusSnapshot(input: {
  isPremium: boolean;
  isLifetime: boolean;
  periodType?: string | null;
  willRenew?: boolean | null;
  entitlementExpirationDate?: string | null;
  premiumUntilDb?: string | null;
  nowMs?: number;
}): SubscriptionStatusSnapshot {
  const isTrial =
    input.isPremium &&
    !input.isLifetime &&
    isTrialPeriodType(input.periodType);

  const premiumExpiresAt = input.isLifetime
    ? null
    : resolvePremiumExpirationIso({
        entitlementExpirationDate: input.entitlementExpirationDate,
        premiumUntilDb: input.premiumUntilDb,
      });

  const daysUntilPremiumExpiry = input.isPremium
    ? daysUntilIso(premiumExpiresAt, input.nowMs)
    : null;

  const willRenew =
    !input.isPremium || input.isLifetime
      ? null
      : typeof input.willRenew === "boolean"
        ? input.willRenew
        : null;

  const showPremiumEndingBanner = shouldShowPremiumEndingBanner({
    isPremium: input.isPremium,
    isLifetime: input.isLifetime,
    isTrial,
    willRenew,
    daysUntilExpiry: daysUntilPremiumExpiry,
  });

  return {
    isTrial,
    willRenew,
    premiumExpiresAt,
    daysUntilPremiumExpiry,
    showPremiumEndingBanner,
    premiumEndingKind: resolvePremiumEndingKind({
      isTrial,
      showBanner: showPremiumEndingBanner,
    }),
  };
}
