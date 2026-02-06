import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../services/supabase/client";
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
};

const PREMIUM_PHOTOS_PER_VEHICLE_LIMIT = 40;

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
};

const EntitlementsContext = createContext<EntitlementsContextValue | null>(
  null
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
  };
}

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
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
  };

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    (async () => {
      if (!user) {
        if (alive) {
          setEntitlements(DEFAULT_ENTITLEMENTS);
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await fetchEntitlements();
        if (alive) {
          setEntitlements(data);
        }
      } catch (error) {
        console.error("Failed to fetch entitlements:", error);
        if (alive) {
          setEntitlements(DEFAULT_ENTITLEMENTS);
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [user]);

  const computed = useMemo(() => {
    if (!entitlements) {
      return {
        canGenerateReport: false,
        canGenerateListing: false,
        isPremium: false,
        reportsRemaining: 0,
        listingsRemaining: 0,
        vehiclesLimit: 1,
        photosPerVehicleLimit: 6,
        tiresPerVehicleLimit: 1,
        wheelsPerVehicleLimit: 1,
        workshopsLimit: 3,
        remindersLimit: 5,
      };
    }

    const isPremium =
      entitlements.plan === "premium" ||
      entitlements.plan === "lifetime" ||
      (entitlements.premium_until !== null &&
        new Date(entitlements.premium_until) > new Date());

    const canGenerateReport =
      isPremium || entitlements.reports_remaining > 0;
    const canGenerateListing =
      isPremium || entitlements.listings_remaining > 0;

    return {
      canGenerateReport,
      canGenerateListing,
      isPremium,
      reportsRemaining: entitlements.reports_remaining,
      listingsRemaining: entitlements.listings_remaining,
      vehiclesLimit: entitlements.vehicles_limit,
      // In Premium we allow up to 40 photos per vehicle in the app UI.
      // Server-side checks treat premium as unlimited, but the UI needs a sensible cap.
      photosPerVehicleLimit: isPremium
        ? PREMIUM_PHOTOS_PER_VEHICLE_LIMIT
        : entitlements.photos_per_vehicle_limit,
      tiresPerVehicleLimit: entitlements.tires_per_vehicle_limit,
      wheelsPerVehicleLimit: entitlements.wheels_per_vehicle_limit,
      workshopsLimit: entitlements.workshops_limit,
      remindersLimit: entitlements.reminders_limit,
    };
  }, [entitlements]);

  const value = useMemo<EntitlementsContextValue>(
    () => ({
      entitlements,
      isLoading,
      refresh,
      ...computed,
    }),
    [entitlements, isLoading, refresh, computed]
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
    throw new Error(
      "useEntitlements must be used within EntitlementsProvider"
    );
  return ctx;
}
