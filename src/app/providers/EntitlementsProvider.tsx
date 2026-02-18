import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesOfferings,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { supabase } from "../../services/supabase/client";
import {
  REVENUECAT_PREMIUM_ENTITLEMENT_ID,
  REVENUECAT_PUBLIC_API_KEY,
  type RevenueCatProductId,
  type RevenueCatProductsMap,
  REVENUECAT_NON_SUBSCRIPTION_PRODUCT_IDS,
  REVENUECAT_SUBSCRIPTION_PRODUCT_IDS,
  createEmptyRevenueCatProducts,
  findPackageForProductId,
  getPremiumEntitlement,
  isPremiumEntitlementActive,
  isRevenueCatProductId,
  isSubscriptionProduct,
  normalizeProductIdFromRC,
} from "../../services/payments/revenuecat";
import { useAuth } from "./AuthProvider";

export type EntitlementPlan = "free" | "premium" | "lifetime";

export type Entitlements = {
  plan: EntitlementPlan;
  reports_remaining: number;
  listings_remaining: number;
  vehicles_limit: number;
  photos_per_vehicle_limit: number;
  tires_per_vehicle_limit: number;
  wheels_per_vehicle_limit: number;
  workshops_limit: number;
  reminders_limit: number;
  premium_until: string | null;
  product_id: string | null;
  /** Vehicle visible on free plan; set only when user saves picker choice. */
  free_plan_vehicle_id: string | null;
  /** When user downgraded to free; used for 90-day retention and countdown. */
  downgraded_at: string | null;
  /** Free plan: fixed set of visible workshop IDs (oldest by created_at). */
  free_plan_workshop_ids: string[];
  /** Free plan: fixed set of visible reminder IDs for free_plan_vehicle_id. */
  free_plan_reminder_ids: string[];
  /** Free plan: single visible tire set for free vehicle. */
  free_plan_tire_id: string | null;
  /** Free plan: single visible wheel set for free vehicle. */
  free_plan_wheel_id: string | null;
};

const PREMIUM_PHOTOS_PER_VEHICLE_LIMIT = 40;
/** Effective "unlimited" for backend and UI (DB stores 999 for premium). */
const PREMIUM_UNLIMITED = 999;
/** Max limits for free plan; clamp DB values so free users never see more even if DB is stale. */
const FREE_WORKSHOPS_LIMIT = 3;
const FREE_REMINDERS_LIMIT = 5;
const IS_REVENUECAT_PLATFORM =
  Platform.OS === "ios" || Platform.OS === "android";

/**
 * Returns the next 3:00 AM in the device's local timezone at or after the given
 * instant. Used so premium expiry happens at 3:00 local to minimize interrupting use.
 */
function nextLocal3amMs(iso: string): number | null {
  const baseMs = Date.parse(iso);
  if (!Number.isFinite(baseMs)) return null;
  const d = new Date(baseMs);
  const candidate = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    3,
    0,
    0,
    0,
  );
  if (candidate.getTime() <= baseMs) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

type EntitlementsContextValue = {
  entitlements: Entitlements | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  // Computed helpers
  canGenerateReport: boolean;
  canGenerateListing: boolean;
  isPremium: boolean;
  reportsRemaining: number;
  listingsRemaining: number;
  vehiclesLimit: number;
  photosPerVehicleLimit: number;
  tiresPerVehicleLimit: number;
  wheelsPerVehicleLimit: number;
  workshopsLimit: number;
  remindersLimit: number;
  /** Active plan product (monthly/yearly/lifetime) when premium; null when free. */
  currentPlanProductId: RevenueCatProductId | null;
  /** Vehicle id visible on free plan; null when premium or not yet chosen. */
  freePlanVehicleId: string | null;
  /** Free plan: workshop IDs to display (empty when premium). */
  freePlanWorkshopIds: string[];
  /** Free plan: reminder IDs to display for free vehicle (empty when premium). */
  freePlanReminderIds: string[];
  /** Free plan: tire ID to display for free vehicle (null when premium). */
  freePlanTireId: string | null;
  /** Free plan: wheel ID to display for free vehicle (null when premium). */
  freePlanWheelId: string | null;
  /** When user downgraded to free (ISO string); null when premium. */
  downgradedAt: string | null;
  /** Days until hidden vehicles data is deleted (90-day retention). Null when premium or no downgraded_at. */
  daysUntilHiddenDataDeletion: number | null;
  /** Set free plan vehicle (call when user saves picker choice). */
  setFreePlanVehicleId: (vehicleId: string) => Promise<void>;

  // RevenueCat
  isRevenueCatReady: boolean;
  isRevenueCatPremium: boolean;
  revenueCatCustomerInfo: CustomerInfo | null;
  revenueCatOfferings: PurchasesOfferings | null;
  revenueCatProducts: RevenueCatProductsMap;
  premiumEntitlement: PurchasesEntitlementInfo | null;
  refreshRevenueCat: () => Promise<void>;
  purchaseRevenueCatProduct: (
    productId: RevenueCatProductId,
  ) => Promise<CustomerInfo>;
  restoreRevenueCatPurchases: () => Promise<CustomerInfo>;
  syncRevenueCatPurchases: () => Promise<CustomerInfo>;
  presentRevenueCatPaywall: () => Promise<PAYWALL_RESULT>;
  presentRevenueCatPaywallIfNeeded: () => Promise<PAYWALL_RESULT>;
  presentRevenueCatCustomerCenter: () => Promise<void>;
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(
  null,
);

const DEFAULT_ENTITLEMENTS: Entitlements = {
  plan: "free",
  reports_remaining: 0,
  listings_remaining: 0,
  vehicles_limit: 1,
  photos_per_vehicle_limit: 6,
  tires_per_vehicle_limit: 1,
  wheels_per_vehicle_limit: 1,
  workshops_limit: 3,
  reminders_limit: 5,
  premium_until: null,
  product_id: null,
  free_plan_vehicle_id: null,
  downgraded_at: null,
  free_plan_workshop_ids: [],
  free_plan_reminder_ids: [],
  free_plan_tire_id: null,
  free_plan_wheel_id: null,
};

async function fetchEntitlements(): Promise<Entitlements> {
  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .single();

  if (error) {
    // If entitlements don't exist yet (shouldn't happen with trigger, but handle gracefully)
    if (error.code === "PGRST116") {
      return DEFAULT_ENTITLEMENTS;
    }
    throw error;
  }

  return {
    plan: (data.plan as EntitlementPlan) ?? "free",
    reports_remaining: data.reports_remaining ?? 0,
    listings_remaining: data.listings_remaining ?? 0,
    vehicles_limit: data.vehicles_limit ?? 1,
    photos_per_vehicle_limit: data.photos_per_vehicle_limit ?? 6,
    tires_per_vehicle_limit: data.tires_per_vehicle_limit ?? 1,
    wheels_per_vehicle_limit: data.wheels_per_vehicle_limit ?? 1,
    workshops_limit: data.workshops_limit ?? 3,
    reminders_limit: data.reminders_limit ?? 5,
    premium_until: data.premium_until ?? null,
    product_id: data.product_id ?? null,
    free_plan_vehicle_id: data.free_plan_vehicle_id ?? null,
    downgraded_at: data.downgraded_at ?? null,
    free_plan_workshop_ids: Array.isArray(data.free_plan_workshop_ids) ? data.free_plan_workshop_ids : [],
    free_plan_reminder_ids: Array.isArray(data.free_plan_reminder_ids) ? data.free_plan_reminder_ids : [],
    free_plan_tire_id: data.free_plan_tire_id ?? null,
    free_plan_wheel_id: data.free_plan_wheel_id ?? null,
  };
}

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const userDisplayName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [revenueCatCustomerInfo, setRevenueCatCustomerInfo] =
    useState<CustomerInfo | null>(null);
  const [revenueCatOfferings, setRevenueCatOfferings] =
    useState<PurchasesOfferings | null>(null);
  const [revenueCatProducts, setRevenueCatProducts] =
    useState<RevenueCatProductsMap>(createEmptyRevenueCatProducts);
  /**
   * Single-shot clock tick used to recompute time-based entitlements (premium_until)
   * without polling. Updated by a setTimeout scheduled for premium_until.
   */
  const [entitlementsClockMs, setEntitlementsClockMs] = useState(() =>
    Date.now(),
  );

  const refreshSupabaseEntitlements = useCallback(async () => {
    if (!userId) {
      setEntitlements(DEFAULT_ENTITLEMENTS);
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchEntitlements();
      setEntitlements(data);
    } catch (error) {
      console.error("Failed to fetch entitlements:", error);
      // On error, use defaults
      setEntitlements(DEFAULT_ENTITLEMENTS);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchRevenueCatData = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM) return;

    const [nextCustomerInfo, nextOfferings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);

    const [subscriptionProductsResult, oneTimeProductsResult] =
      await Promise.allSettled([
        Purchases.getProducts(
          [...REVENUECAT_SUBSCRIPTION_PRODUCT_IDS],
          Purchases.PRODUCT_CATEGORY.SUBSCRIPTION,
        ),
        Purchases.getProducts(
          [...REVENUECAT_NON_SUBSCRIPTION_PRODUCT_IDS],
          Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
        ),
      ]);

    if (subscriptionProductsResult.status === "rejected") {
      console.error(
        "Failed to load RevenueCat subscription products:",
        subscriptionProductsResult.reason,
      );
    }

    if (oneTimeProductsResult.status === "rejected") {
      console.error(
        "Failed to load RevenueCat one-time products:",
        oneTimeProductsResult.reason,
      );
    }

    const subscriptionProducts =
      subscriptionProductsResult.status === "fulfilled"
        ? subscriptionProductsResult.value
        : [];
    const oneTimeProducts =
      oneTimeProductsResult.status === "fulfilled"
        ? oneTimeProductsResult.value
        : [];

    const nextProducts = createEmptyRevenueCatProducts();

    for (const maybeProduct of [
      ...subscriptionProducts,
      ...oneTimeProducts,
      ...(nextOfferings.current?.availablePackages.map(
        (candidate) => candidate.product,
      ) ?? []),
    ]) {
      if (isRevenueCatProductId(maybeProduct.identifier)) {
        nextProducts[maybeProduct.identifier] = maybeProduct;
      }
    }

    setRevenueCatCustomerInfo(nextCustomerInfo);
    setRevenueCatOfferings(nextOfferings);
    setRevenueCatProducts(nextProducts);
  }, []);

  const refreshRevenueCat = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM || !isRevenueCatReady) return;
    try {
      await fetchRevenueCatData();
    } catch (error) {
      console.error("Failed to refresh RevenueCat data:", error);
    }
  }, [fetchRevenueCatData, isRevenueCatReady]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshSupabaseEntitlements(), refreshRevenueCat()]);
  }, [refreshSupabaseEntitlements, refreshRevenueCat]);

  /** Sync RevenueCat state to Supabase (updates plan, limits, clears free_plan_vehicle_id on premium). */
  const syncEntitlementsToSupabase = useCallback(async () => {
    const { error } = await supabase.functions.invoke(
      "sync-entitlements-from-revenuecat",
      { method: "POST" },
    );
    if (error) throw error;
  }, []);

  const setFreePlanVehicleId = useCallback(
    async (vehicleId: string) => {
      if (!userId) return;
      const { error } = await supabase.rpc("set_free_plan_vehicle", {
        p_vehicle_id: vehicleId,
      });
      if (error) throw error;
      await refreshSupabaseEntitlements();
    },
    [userId, refreshSupabaseEntitlements],
  );

  const syncRevenueCatPurchases = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM) {
      throw new Error("RevenueCat purchases are only available on mobile.");
    }
    if (!isRevenueCatReady) {
      throw new Error("RevenueCat is still initializing. Please try again.");
    }

    const result = await Purchases.syncPurchasesForResult();
    setRevenueCatCustomerInfo(result.customerInfo);
    await refresh();
    return result.customerInfo;
  }, [isRevenueCatReady, refresh]);

  const restoreRevenueCatPurchases = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM) {
      throw new Error("RevenueCat purchases are only available on mobile.");
    }
    if (!isRevenueCatReady) {
      throw new Error("RevenueCat is still initializing. Please try again.");
    }

    const nextCustomerInfo = await Purchases.restorePurchases();
    setRevenueCatCustomerInfo(nextCustomerInfo);

    // Sync RC state to Supabase so DB reflects premium and clears free_plan_vehicle_id (RC does not send webhook on restore)
    await syncEntitlementsToSupabase();
    await refresh();
    return nextCustomerInfo;
  }, [isRevenueCatReady, refresh, syncEntitlementsToSupabase]);

  const purchaseRevenueCatProduct = useCallback(
    async (productId: RevenueCatProductId) => {
      if (!IS_REVENUECAT_PLATFORM) {
        throw new Error("RevenueCat purchases are only available on mobile.");
      }
      if (!isRevenueCatReady) {
        throw new Error("RevenueCat is still initializing. Please try again.");
      }

      const packageToPurchase = findPackageForProductId(
        revenueCatOfferings?.current,
        productId,
      );

      let purchasedProductIdentifier: string | null = null;
      let nextCustomerInfo: CustomerInfo;

      if (packageToPurchase) {
        const result = await Purchases.purchasePackage(packageToPurchase);
        purchasedProductIdentifier = result.productIdentifier;
        nextCustomerInfo = result.customerInfo;
      } else {
        const fallbackCategory = isSubscriptionProduct(productId)
          ? Purchases.PRODUCT_CATEGORY.SUBSCRIPTION
          : Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION;

        const fallbackProducts = await Purchases.getProducts(
          [productId],
          fallbackCategory,
        );
        const fallbackProduct =
          fallbackProducts[0] ?? revenueCatProducts[productId];

        if (!fallbackProduct) {
          throw new Error(
            `RevenueCat product "${productId}" is not available in the current offering/store.`,
          );
        }

        const result = await Purchases.purchaseStoreProduct(fallbackProduct);
        purchasedProductIdentifier = result.productIdentifier;
        nextCustomerInfo = result.customerInfo;
      }

      // Keep local RevenueCat state in sync immediately after purchase.
      if (purchasedProductIdentifier) {
        setRevenueCatCustomerInfo(nextCustomerInfo);
      }

      // Sync to Supabase so DB updates plan and clears free_plan_vehicle_id (webhook may be delayed)
      await syncEntitlementsToSupabase();
      await refresh();
      return nextCustomerInfo;
    },
    [
      isRevenueCatReady,
      refresh,
      syncEntitlementsToSupabase,
      revenueCatOfferings,
      revenueCatProducts,
    ],
  );

  const presentRevenueCatPaywall = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM) {
      throw new Error("RevenueCat paywall is only available on mobile.");
    }
    if (!isRevenueCatReady) {
      throw new Error("RevenueCat is still initializing. Please try again.");
    }

    const result = await RevenueCatUI.presentPaywall({
      offering: revenueCatOfferings?.current ?? undefined,
    });

    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      await syncEntitlementsToSupabase();
      await refresh();
    }

    return result;
  }, [
    isRevenueCatReady,
    refresh,
    syncEntitlementsToSupabase,
    revenueCatOfferings,
  ]);

  const presentRevenueCatPaywallIfNeeded = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM) {
      throw new Error("RevenueCat paywall is only available on mobile.");
    }
    if (!isRevenueCatReady) {
      throw new Error("RevenueCat is still initializing. Please try again.");
    }

    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: REVENUECAT_PREMIUM_ENTITLEMENT_ID,
      offering: revenueCatOfferings?.current ?? undefined,
    });

    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      await syncEntitlementsToSupabase();
      await refresh();
    }

    return result;
  }, [
    isRevenueCatReady,
    refresh,
    syncEntitlementsToSupabase,
    revenueCatOfferings,
  ]);

  const presentRevenueCatCustomerCenter = useCallback(async () => {
    if (!IS_REVENUECAT_PLATFORM || !isRevenueCatReady) return;

    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: ({ customerInfo }) => {
          setRevenueCatCustomerInfo(customerInfo);
          void refreshSupabaseEntitlements();
        },
        onRestoreFailed: ({ error }) => {
          console.error("RevenueCat Customer Center restore failed:", error);
        },
      },
    });
    await refresh();
  }, [isRevenueCatReady, refresh, refreshSupabaseEntitlements]);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    (async () => {
      try {
        await refreshSupabaseEntitlements();
      } catch (error) {
        console.error("Failed to load entitlements:", error);
        if (alive) {
          setEntitlements(DEFAULT_ENTITLEMENTS);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshSupabaseEntitlements]);

  useEffect(() => {
    if (!IS_REVENUECAT_PLATFORM) return;

    let alive = true;
    const customerInfoListener = (nextCustomerInfo: CustomerInfo) => {
      if (alive) {
        setRevenueCatCustomerInfo(nextCustomerInfo);
      }
    };

    (async () => {
      try {
        const isConfigured = await Purchases.isConfigured();
        if (!isConfigured) {
          await Purchases.setLogLevel(
            __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO,
          );
          Purchases.configure({
            apiKey: REVENUECAT_PUBLIC_API_KEY,
          });
        }

        Purchases.addCustomerInfoUpdateListener(customerInfoListener);
        if (!alive) return;

        setIsRevenueCatReady(true);
        await fetchRevenueCatData();
      } catch (error) {
        console.error("Failed to initialize RevenueCat:", error);
      }
    })();

    return () => {
      alive = false;
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [fetchRevenueCatData]);

  useEffect(() => {
    if (!IS_REVENUECAT_PLATFORM || !isRevenueCatReady) return;

    let alive = true;

    (async () => {
      try {
        if (userId) {
          await Purchases.logIn(userId);
          await Promise.all([
            Purchases.setAttributes({ supabase_user_id: userId }),
            Purchases.setEmail(userEmail),
            Purchases.setDisplayName(userDisplayName),
          ]);
        } else {
          const isAnonymous = await Purchases.isAnonymous();
          if (!isAnonymous) {
            await Purchases.logOut();
          }
        }

        if (alive) {
          await fetchRevenueCatData();
        }
      } catch (error) {
        console.error("Failed to sync RevenueCat user:", error);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    fetchRevenueCatData,
    isRevenueCatReady,
    userDisplayName,
    userEmail,
    userId,
  ]);

  // Single-shot timer: when effective premium expiry (next 3:00 local) is reached,
  // tick state to force recompute of computed.isPremium.
  useEffect(() => {
    const premiumUntil = entitlements?.premium_until ?? null;
    const plan = entitlements?.plan ?? null;
    if (!premiumUntil || plan !== "premium") return;

    const untilMs = nextLocal3amMs(premiumUntil);
    if (untilMs == null || !Number.isFinite(untilMs)) return;

    const nowMs = Date.now();
    const msLeft = untilMs - nowMs;
    if (msLeft <= 0) {
      setEntitlementsClockMs(nowMs);
      return;
    }

    const id = setTimeout(() => {
      setEntitlementsClockMs(Date.now());
    }, msLeft + 500);
    return () => clearTimeout(id);
  }, [entitlements?.premium_until, entitlements?.plan]);

  const RETENTION_DAYS = 90;

  const computed = useMemo(() => {
    if (!entitlements) {
      return {
        canGenerateReport: false,
        canGenerateListing: false,
        isPremium: false,
        isRevenueCatPremium: false,
        premiumEntitlement: null,
        reportsRemaining: 0,
        listingsRemaining: 0,
        vehiclesLimit: 1,
        photosPerVehicleLimit: 6,
        tiresPerVehicleLimit: 1,
        wheelsPerVehicleLimit: 1,
        workshopsLimit: 3,
        remindersLimit: 5,
        currentPlanProductId: null,
        freePlanVehicleId: null,
        freePlanWorkshopIds: [],
        freePlanReminderIds: [],
        freePlanTireId: null,
        freePlanWheelId: null,
        downgradedAt: null,
        daysUntilHiddenDataDeletion: null,
        setFreePlanVehicleId,
      };
    }

    // Use next 3:00 AM local as effective expiry so transition to free happens at night.
    const premiumUntilMs =
      entitlements.plan === "premium" && entitlements.premium_until != null
        ? nextLocal3amMs(entitlements.premium_until)
        : entitlements.premium_until != null
          ? Date.parse(entitlements.premium_until)
          : null;
    const hasActivePremiumUntil =
      premiumUntilMs != null &&
      Number.isFinite(premiumUntilMs) &&
      premiumUntilMs > entitlementsClockMs;

    // DB-derived premium should respect premium_until when present, so local expiry works
    // even if entitlements haven't been refreshed yet.
    const isPremiumFromDb =
      entitlements.plan === "lifetime" ||
      hasActivePremiumUntil ||
      (entitlements.plan === "premium" && premiumUntilMs == null);

    // When premium_until is in the past (timer fired), force free locally so we don't
    // rely on stale RevenueCat cache still saying "active".
    const premiumUntilExpired =
      premiumUntilMs != null &&
      Number.isFinite(premiumUntilMs) &&
      premiumUntilMs <= entitlementsClockMs;

    const isPremium = premiumUntilExpired
      ? false
      : isPremiumFromDb || isPremiumEntitlementActive(revenueCatCustomerInfo);

    const premiumEntitlement = getPremiumEntitlement(revenueCatCustomerInfo);

    const canGenerateReport = isPremium;
    const canGenerateListing = isPremium;

    const currentPlanProductId: RevenueCatProductId | null = isPremium
      ? (entitlements.product_id &&
        isRevenueCatProductId(entitlements.product_id)
        ? entitlements.product_id
        : normalizeProductIdFromRC(
            premiumEntitlement?.productIdentifier,
          )) ?? null
      : null;

    const downgradedAt = entitlements.downgraded_at ?? null;
    let daysUntilHiddenDataDeletion: number | null = null;
    if (downgradedAt && !isPremium) {
      const deadline = new Date(downgradedAt);
      deadline.setDate(deadline.getDate() + RETENTION_DAYS);
      const now = new Date();
      const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilHiddenDataDeletion = Math.max(0, diff);
    }

    return {
      canGenerateReport,
      canGenerateListing,
      isPremium,
      isRevenueCatPremium: premiumEntitlement?.isActive === true,
      premiumEntitlement,
      reportsRemaining: entitlements.reports_remaining,
      listingsRemaining: entitlements.listings_remaining,
      vehiclesLimit: isPremium
        ? PREMIUM_UNLIMITED
        : entitlements.vehicles_limit,
      photosPerVehicleLimit: isPremium
        ? PREMIUM_PHOTOS_PER_VEHICLE_LIMIT
        : entitlements.photos_per_vehicle_limit,
      tiresPerVehicleLimit: isPremium
        ? PREMIUM_UNLIMITED
        : entitlements.tires_per_vehicle_limit,
      wheelsPerVehicleLimit: isPremium
        ? PREMIUM_UNLIMITED
        : entitlements.wheels_per_vehicle_limit,
      workshopsLimit: isPremium
        ? PREMIUM_UNLIMITED
        : Math.min(entitlements.workshops_limit, FREE_WORKSHOPS_LIMIT),
      remindersLimit: isPremium
        ? PREMIUM_UNLIMITED
        : Math.min(entitlements.reminders_limit, FREE_REMINDERS_LIMIT),
      currentPlanProductId,
      freePlanVehicleId: entitlements.free_plan_vehicle_id ?? null,
      freePlanWorkshopIds: isPremium ? [] : (entitlements.free_plan_workshop_ids ?? []),
      freePlanReminderIds: isPremium ? [] : (entitlements.free_plan_reminder_ids ?? []),
      freePlanTireId: isPremium ? null : (entitlements.free_plan_tire_id ?? null),
      freePlanWheelId: isPremium ? null : (entitlements.free_plan_wheel_id ?? null),
      downgradedAt,
      daysUntilHiddenDataDeletion,
      setFreePlanVehicleId,
    };
  }, [
    entitlements,
    revenueCatCustomerInfo,
    setFreePlanVehicleId,
    entitlementsClockMs,
  ]);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      entitlements,
      isLoading,
      refresh,
      ...computed,
      isRevenueCatReady,
      revenueCatCustomerInfo,
      revenueCatOfferings,
      revenueCatProducts,
      refreshRevenueCat,
      purchaseRevenueCatProduct,
      restoreRevenueCatPurchases,
      syncRevenueCatPurchases,
      presentRevenueCatPaywall,
      presentRevenueCatPaywallIfNeeded,
      presentRevenueCatCustomerCenter,
    }),
    [
      entitlements,
      isLoading,
      refresh,
      computed,
      isRevenueCatReady,
      revenueCatCustomerInfo,
      revenueCatOfferings,
      revenueCatProducts,
      refreshRevenueCat,
      purchaseRevenueCatProduct,
      restoreRevenueCatPurchases,
      syncRevenueCatPurchases,
      presentRevenueCatPaywall,
      presentRevenueCatPaywallIfNeeded,
      presentRevenueCatCustomerCenter,
    ],
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx)
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  return ctx;
}
