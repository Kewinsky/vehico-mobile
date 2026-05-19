/**
 * Single source of truth for App Store / RevenueCat product identifiers.
 * Change store IDs here only — app, webhook, and tests import from this module.
 */

/** App Store Connect product identifiers (must match RevenueCat + ASC). */
export const IAP_PRODUCT_IDS = {
  monthly: "monthly_premium",
  yearly: "yearly_premium",
  lifetime: "lifetime_premium",
} as const;

export type IapProductKind = keyof typeof IAP_PRODUCT_IDS;
export type IapProductId = (typeof IAP_PRODUCT_IDS)[IapProductKind];

export const IAP_SUBSCRIPTION_KINDS = ["monthly", "yearly"] as const satisfies readonly IapProductKind[];
export const IAP_ONE_TIME_KINDS = ["lifetime"] as const satisfies readonly IapProductKind[];

export const IAP_SUBSCRIPTION_PRODUCT_IDS: readonly IapProductId[] =
  IAP_SUBSCRIPTION_KINDS.map((kind) => IAP_PRODUCT_IDS[kind]);

export const IAP_ONE_TIME_PRODUCT_IDS: readonly IapProductId[] =
  IAP_ONE_TIME_KINDS.map((kind) => IAP_PRODUCT_IDS[kind]);

export const IAP_ALL_PRODUCT_IDS: readonly IapProductId[] =
  Object.values(IAP_PRODUCT_IDS);

/** Shop plan picker order (monthly → yearly → lifetime). */
export const IAP_PLAN_ORDER: readonly IapProductId[] = [
  IAP_PRODUCT_IDS.monthly,
  IAP_PRODUCT_IDS.yearly,
  IAP_PRODUCT_IDS.lifetime,
];

export const IAP_DEFAULT_SUBSCRIPTION = IAP_PRODUCT_IDS.yearly;

/** `shop.products.*` i18n suffix (not the store product id). */
export const IAP_PRODUCT_NAME_I18N_KEY: Record<IapProductId, string> = {
  [IAP_PRODUCT_IDS.monthly]: "premium_monthly",
  [IAP_PRODUCT_IDS.yearly]: "premium_yearly",
  [IAP_PRODUCT_IDS.lifetime]: "lifetime",
};

/** `shop.subscriptionPeriod.*` i18n suffix (semantic, independent of store id). */
export const IAP_SUBSCRIPTION_PERIOD_I18N_KEY: Record<IapProductKind, string> = {
  monthly: "monthly",
  yearly: "yearly",
  lifetime: "lifetime",
};

const NORMALIZE_RULES: ReadonlyArray<{
  kind: IapProductKind;
  test: (lower: string) => boolean;
}> = [
  { kind: "lifetime", test: (s) => s.includes("lifetime") },
  { kind: "yearly", test: (s) => s.includes("yearly") },
  { kind: "monthly", test: (s) => s.includes("monthly") },
];

export function isIapProductId(value: string): value is IapProductId {
  return (IAP_ALL_PRODUCT_IDS as readonly string[]).includes(value);
}

export function getIapProductKind(
  productId: IapProductId,
): IapProductKind | null {
  for (const kind of Object.keys(IAP_PRODUCT_IDS) as IapProductKind[]) {
    if (IAP_PRODUCT_IDS[kind] === productId) return kind;
  }
  return null;
}

export function isSubscriptionIapProduct(productId: IapProductId): boolean {
  return (IAP_SUBSCRIPTION_PRODUCT_IDS as readonly string[]).includes(productId);
}

export function isMonthlyIapProduct(productId: IapProductId): boolean {
  return productId === IAP_PRODUCT_IDS.monthly;
}

export function isYearlyIapProduct(productId: IapProductId): boolean {
  return productId === IAP_PRODUCT_IDS.yearly;
}

export function isLifetimeIapProduct(productId: IapProductId): boolean {
  return productId === IAP_PRODUCT_IDS.lifetime;
}

/** Map RevenueCat / App Store identifiers (incl. legacy) to our product id. */
export function normalizeIapProductId(
  productIdentifier: string | undefined,
): IapProductId | null {
  if (!productIdentifier) return null;
  if (isIapProductId(productIdentifier)) return productIdentifier;
  const lower = productIdentifier.toLowerCase();
  for (const { kind, test } of NORMALIZE_RULES) {
    if (test(lower)) return IAP_PRODUCT_IDS[kind];
  }
  return null;
}

export function createEmptyIapProductsMap<
  T = null,
>(): Record<IapProductId, T> {
  return Object.fromEntries(
    IAP_ALL_PRODUCT_IDS.map((id) => [id, null as T]),
  ) as Record<IapProductId, T>;
}
