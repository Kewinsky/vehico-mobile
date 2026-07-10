import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { createPostgrestChain, supabase } from "../../test/supabaseMock";
import Purchases from "react-native-purchases";

import {
  EntitlementsProvider,
  useEntitlements,
} from "../../core/providers/EntitlementsProvider";
import { IAP_PRODUCT_IDS } from "../../../shared/payments/iapProducts";

jest.mock("../../core/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "u@test.dev",
      user_metadata: {},
    },
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <EntitlementsProvider>{children}</EntitlementsProvider>;
}

describe("EntitlementsProvider (Supabase entitlements + computed limits)", () => {
  beforeEach(() => {
    // Make RevenueCat background effects safe (they run on iOS/Android in tests).
    (Purchases.isConfigured as any).mockResolvedValue(true);
    (Purchases.getCustomerInfo as any).mockResolvedValue({ entitlements: { active: {} } });
    (Purchases.getOfferings as any).mockResolvedValue({ current: null });
    (Purchases.getProducts as any).mockResolvedValue([]);
    (Purchases.addCustomerInfoUpdateListener as any).mockImplementation(() => {});
    (Purchases.removeCustomerInfoUpdateListener as any).mockImplementation(() => {});
    (Purchases.isAnonymous as any).mockResolvedValue(true);
  });

  it("loads defaults when entitlements row is missing (PGRST116)", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: null,
        error: { code: "PGRST116" },
      }),
    );

    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entitlements?.plan).toBe("free");
    expect(result.current.isPremium).toBe(false);
    expect(result.current.workshopsLimit).toBe(3);
    expect(result.current.remindersLimit).toBe(5);
  });

  it("clamps free plan limits even if DB is stale", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: {
          plan: "free",
          vehicles_limit: 1,
          photos_per_vehicle_limit: 6,
          tires_per_vehicle_limit: 1,
          wheels_per_vehicle_limit: 1,
          workshops_limit: 999,
          reminders_limit: 999,
          premium_until: null,
          product_id: null,
          free_plan_vehicle_id: "v1",
          downgraded_at: null,
          free_plan_workshop_ids: ["w1", "w2"],
          free_plan_reminder_ids: ["r1"],
          free_plan_tire_id: "t1",
          free_plan_wheel_id: "wh1",
        },
        error: null,
      }),
    );

    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPremium).toBe(false);
    expect(result.current.workshopsLimit).toBe(3);
    expect(result.current.remindersLimit).toBe(5);
    expect(result.current.freePlanWorkshopIds).toEqual(["w1", "w2"]);
    expect(result.current.freePlanReminderIds).toEqual(["r1"]);
    expect(result.current.freePlanTireId).toBe("t1");
    expect(result.current.freePlanWheelId).toBe("wh1");
  });

  it("treats premium plan as premium and overrides limits to premium values", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: {
          plan: "premium",
          vehicles_limit: 1,
          photos_per_vehicle_limit: 6,
          tires_per_vehicle_limit: 1,
          wheels_per_vehicle_limit: 1,
          workshops_limit: 3,
          reminders_limit: 5,
          premium_until: null,
          product_id: IAP_PRODUCT_IDS.monthly,
          free_plan_vehicle_id: "v1",
          downgraded_at: null,
          free_plan_workshop_ids: ["w1"],
          free_plan_reminder_ids: ["r1"],
          free_plan_tire_id: "t1",
          free_plan_wheel_id: "wh1",
        },
        error: null,
      }),
    );

    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isPremium).toBe(true);
    expect(result.current.vehiclesLimit).toBe(999);
    expect(result.current.photosPerVehicleLimit).toBe(40);
    expect(result.current.workshopsLimit).toBe(999);
    expect(result.current.remindersLimit).toBe(999);
    // Premium hides free-plan ID lists.
    expect(result.current.freePlanWorkshopIds).toEqual([]);
    expect(result.current.freePlanReminderIds).toEqual([]);
    expect(result.current.freePlanTireId).toBeNull();
    expect(result.current.freePlanWheelId).toBeNull();
    expect(result.current.currentPlanProductId).toBe(IAP_PRODUCT_IDS.monthly);
  });

  it("setFreePlanVehicleId calls RPC and refreshes entitlements", async () => {
    const first = createPostgrestChain({
      data: {
        plan: "free",
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
      },
      error: null,
    });
    const second = createPostgrestChain({
      data: {
        plan: "free",
        vehicles_limit: 1,
        photos_per_vehicle_limit: 6,
        tires_per_vehicle_limit: 1,
        wheels_per_vehicle_limit: 1,
        workshops_limit: 3,
        reminders_limit: 5,
        premium_until: null,
        product_id: null,
        free_plan_vehicle_id: "v2",
        downgraded_at: null,
        free_plan_workshop_ids: [],
        free_plan_reminder_ids: [],
        free_plan_tire_id: null,
        free_plan_wheel_id: null,
      },
      error: null,
    });

    supabase.from.mockImplementationOnce(() => first).mockImplementationOnce(() => second);
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.setFreePlanVehicleId("v2");
    });

    expect(supabase.rpc).toHaveBeenCalledWith("set_free_plan_vehicle", {
      p_vehicle_id: "v2",
    });
    expect(result.current.freePlanVehicleId).toBe("v2");
  });

  it("restoreRevenueCatPurchases calls RevenueCat restore flow", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: {
          plan: "free",
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
        },
        error: null,
      }),
    );
    (Purchases.restorePurchases as any).mockResolvedValue({
      entitlements: { active: {} },
    });

    const { result } = renderHook(() => useEntitlements(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isRevenueCatReady).toBe(true));

    await act(async () => {
      await result.current.restoreRevenueCatPurchases();
    });

    expect(Purchases.restorePurchases).toHaveBeenCalledTimes(1);
  });
});

