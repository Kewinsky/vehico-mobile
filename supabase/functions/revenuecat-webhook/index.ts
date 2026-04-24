/**
 * RevenueCat → Supabase entitlements sync (webhook handler).
 *
 * Configure in RevenueCat: Project → Integrations → Webhooks → add URL and
 * set Authorization header to "Bearer <REVENUECAT_WEBHOOK_AUTHORIZATION>".
 *
 * Required env (Supabase Edge Function secrets):
 *   REVENUECAT_WEBHOOK_AUTHORIZATION  – secret that must match the header RevenueCat sends.
 *
 * Product IDs and entitlement must match app config (services/payments/revenuecat.ts).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Must match RevenueCat dashboard and vehico-mobile src/services/payments/revenuecat.ts
const PREMIUM_ENTITLEMENT_ID = "vehico Premium";
const PRODUCT_ID_LIFETIME = "lifetime";
const PRODUCT_IDS_SUBSCRIPTION = ["monthly", "yearly"] as const;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** RevenueCat webhook event (subset we use). See https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields */
interface RevenueCatWebhookEvent {
  type: string;
  id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  environment?: string;
  /** TRANSFER: destination user ids */
  transferred_to?: string[];
  transferred_from?: string[];
}

interface RevenueCatWebhookBody {
  api_version?: string;
  event: RevenueCatWebhookEvent;
}

type EntitlementPlan = "free" | "premium" | "lifetime";

/** Limit column values: free tier vs premium (matches schema and app constants). */
const FREE_LIMITS = {
  vehicles_limit: 1,
  photos_per_vehicle_limit: 6,
  tires_per_vehicle_limit: 1,
  wheels_per_vehicle_limit: 1,
  workshops_limit: 3,
  reminders_limit: 5,
} as const;

const PREMIUM_LIMITS = {
  vehicles_limit: 999,
  photos_per_vehicle_limit: 40,
  tires_per_vehicle_limit: 999,
  wheels_per_vehicle_limit: 999,
  workshops_limit: 999,
  reminders_limit: 999,
} as const;

function isLifetimeProduct(productId: string | undefined): boolean {
  if (!productId) return false;
  return (
    productId === PRODUCT_ID_LIFETIME ||
    productId.toLowerCase().includes("lifetime")
  );
}

function isSubscriptionProduct(productId: string | undefined): boolean {
  if (!productId) return false;
  return PRODUCT_IDS_SUBSCRIPTION.some(
    (id) => productId === id || productId.startsWith(`${id}:`)
  );
}

/** Resolve Supabase user_id from event (app_user_id or TRANSFER destination). */
function getTargetUserId(event: RevenueCatWebhookEvent): string | null {
  if (event.app_user_id) return event.app_user_id;
  // TRANSFER: webhook is sent for destination; use first transferred_to as target
  if (event.transferred_to?.length) return event.transferred_to[0];
  return null;
}

/** Normalize RevenueCat product_id to our enum (monthly | yearly | lifetime). */
function normalizeProductId(productId: string | undefined): string | null {
  if (!productId) return null;
  const lower = productId.toLowerCase();
  if (lower === "lifetime" || lower.includes("lifetime")) return "lifetime";
  if (lower === "monthly" || lower.startsWith("monthly")) return "monthly";
  if (lower === "yearly" || lower.startsWith("yearly")) return "yearly";
  return null;
}

/** Full entitlements row update (plan, premium_until, limits, product_id). */
type EntitlementsUpdate = {
  plan: EntitlementPlan;
  premium_until: string | null;
  product_id: string | null;
  vehicles_limit: number;
  photos_per_vehicle_limit: number;
  tires_per_vehicle_limit: number;
  wheels_per_vehicle_limit: number;
  workshops_limit: number;
  reminders_limit: number;
};

type SupabaseClient = ReturnType<typeof createClient>;

type FreePlanSelections = {
  freePlanVehicleId: string | null;
  freePlanWorkshopIds: string[];
  freePlanReminderIds: string[];
  freePlanTireId: string | null;
  freePlanWheelId: string | null;
};

async function buildFreePlanSelections(
  supabase: SupabaseClient,
  userId: string,
  preferredVehicleId: string | null,
): Promise<FreePlanSelections> {
  const { data: workshopRows, error: workshopError } = await supabase
    .from("workshops")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(FREE_LIMITS.workshops_limit);
  if (workshopError) throw workshopError;

  let freePlanVehicleId = preferredVehicleId;
  if (freePlanVehicleId) {
    const { data: preferredVehicleRows, error: preferredVehicleError } =
      await supabase
        .from("vehicles")
        .select("id")
        .eq("id", freePlanVehicleId)
        .eq("owner_id", userId)
        .limit(1);
    if (preferredVehicleError) throw preferredVehicleError;
    freePlanVehicleId = preferredVehicleRows?.[0]?.id ?? null;
  }

  if (!freePlanVehicleId) {
    const { data: vehicleRows, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true })
      .limit(2);
    if (vehicleError) throw vehicleError;
    freePlanVehicleId =
      vehicleRows != null && vehicleRows.length === 1
        ? (vehicleRows[0]?.id ?? null)
        : null;
  }

  if (!freePlanVehicleId) {
    return {
      freePlanVehicleId: null,
      freePlanWorkshopIds: (workshopRows ?? []).map((row: { id: string }) => row.id),
      freePlanReminderIds: [],
      freePlanTireId: null,
      freePlanWheelId: null,
    };
  }

  const [reminderResult, tireResult, wheelResult] = await Promise.all([
    supabase
      .from("reminders")
      .select("id")
      .eq("vehicle_id", freePlanVehicleId)
      .order("created_at", { ascending: true })
      .limit(FREE_LIMITS.reminders_limit),
    supabase
      .from("tires")
      .select("id")
      .eq("vehicle_id", freePlanVehicleId)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("wheels")
      .select("id")
      .eq("vehicle_id", freePlanVehicleId)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  if (reminderResult.error) throw reminderResult.error;
  if (tireResult.error) throw tireResult.error;
  if (wheelResult.error) throw wheelResult.error;

  return {
    freePlanVehicleId,
    freePlanWorkshopIds: (workshopRows ?? []).map((row: { id: string }) => row.id),
    freePlanReminderIds: (reminderResult.data ?? []).map(
      (row: { id: string }) => row.id,
    ),
    freePlanTireId: tireResult.data?.[0]?.id ?? null,
    freePlanWheelId: wheelResult.data?.[0]?.id ?? null,
  };
}

/** Build entitlements update from event type and payload. */
function getEntitlementsUpdate(
  event: RevenueCatWebhookEvent
): EntitlementsUpdate | null {
  const type = event.type;
  const productId = event.product_id;
  const expirationAtMs = event.expiration_at_ms;

  switch (type) {
    case "TEST":
      return null; // no DB update for test

    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "NON_RENEWING_PURCHASE":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
    case "PRODUCT_CHANGE": {
      const normalizedProduct = normalizeProductId(productId);
      if (isLifetimeProduct(productId)) {
        return {
          plan: "lifetime",
          premium_until: null,
          product_id: normalizedProduct ?? "lifetime",
          ...PREMIUM_LIMITS,
        };
      }
      if (isSubscriptionProduct(productId) && expirationAtMs != null) {
        const premiumUntil = new Date(expirationAtMs).toISOString();
        return {
          plan: "premium",
          premium_until: premiumUntil,
          product_id: normalizedProduct,
          ...PREMIUM_LIMITS,
        };
      }
      if (expirationAtMs != null) {
        return {
          plan: "premium",
          premium_until: new Date(expirationAtMs).toISOString(),
          product_id: normalizedProduct,
          ...PREMIUM_LIMITS,
        };
      }
      if (event.entitlement_ids?.includes(PREMIUM_ENTITLEMENT_ID)) {
        return {
          plan: "premium",
          premium_until: null,
          product_id: normalizedProduct,
          ...PREMIUM_LIMITS,
        };
      }
      return null;
    }

    case "CANCELLATION":
      if (expirationAtMs != null) {
        return {
          plan: "premium",
          premium_until: new Date(expirationAtMs).toISOString(),
          product_id: normalizeProductId(productId),
          ...PREMIUM_LIMITS,
        };
      }
      return {
        plan: "free",
        premium_until: null,
        product_id: null,
        ...FREE_LIMITS,
      };

    case "EXPIRATION":
      return {
        plan: "free",
        premium_until: null,
        product_id: null,
        ...FREE_LIMITS,
      };

    case "TRANSFER": {
      const normalized = normalizeProductId(productId);
      if (isLifetimeProduct(productId)) {
        return {
          plan: "lifetime",
          premium_until: null,
          product_id: normalized ?? "lifetime",
          ...PREMIUM_LIMITS,
        };
      }
      if (expirationAtMs != null) {
        return {
          plan: "premium",
          premium_until: new Date(expirationAtMs).toISOString(),
          product_id: normalized,
          ...PREMIUM_LIMITS,
        };
      }
      return null;
    }

    case "BILLING_ISSUE":
    case "SUBSCRIPTION_PAUSED":
    default:
      return null;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
  if (!expectedSecret) {
    console.error("REVENUECAT_WEBHOOK_AUTHORIZATION is not set");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const expectedAuth = expectedSecret.startsWith("Bearer ")
    ? expectedSecret
    : `Bearer ${expectedSecret}`;
  if (authHeader !== expectedAuth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: RevenueCatWebhookBody;
  try {
    body = (await req.json()) as RevenueCatWebhookBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const event = body?.event;
  if (!event?.type) {
    return new Response(
      JSON.stringify({ error: "Missing event or event.type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = getTargetUserId(event);
  if (!userId) {
    return new Response(
      JSON.stringify({
        received: true,
        message: "No target user id (e.g. TRANSFER without app_user_id)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const update = getEntitlementsUpdate(event);
  if (!update) {
    return new Response(
      JSON.stringify({ received: true, message: "No entitlement update for type" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date().toISOString();
  const {
    data: currentEntitlements,
    error: currentEntitlementsError,
  } = await supabase
    .from("entitlements")
    .select("free_plan_vehicle_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (currentEntitlementsError) {
    console.error("Failed to load current entitlements:", currentEntitlementsError);
    return new Response(
      JSON.stringify({ error: "Failed to load current entitlements" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const dbUpdate: Record<string, unknown> = {
    plan: update.plan,
    premium_until: update.premium_until,
    product_id: update.product_id,
    vehicles_limit: update.vehicles_limit,
    photos_per_vehicle_limit: update.photos_per_vehicle_limit,
    tires_per_vehicle_limit: update.tires_per_vehicle_limit,
    wheels_per_vehicle_limit: update.wheels_per_vehicle_limit,
    workshops_limit: update.workshops_limit,
    reminders_limit: update.reminders_limit,
    updated_at: now,
  };
  if (update.plan === "free") {
    const freePlanSelections = await buildFreePlanSelections(
      supabase,
      userId,
      currentEntitlements?.free_plan_vehicle_id ?? null,
    );
    dbUpdate.downgraded_at = now;
    dbUpdate.free_plan_vehicle_id = freePlanSelections.freePlanVehicleId;
    dbUpdate.free_plan_workshop_ids = freePlanSelections.freePlanWorkshopIds;
    dbUpdate.free_plan_reminder_ids = freePlanSelections.freePlanReminderIds;
    dbUpdate.free_plan_tire_id = freePlanSelections.freePlanTireId;
    dbUpdate.free_plan_wheel_id = freePlanSelections.freePlanWheelId;
  } else {
    dbUpdate.free_plan_vehicle_id = null;
    dbUpdate.downgraded_at = null;
    dbUpdate.free_plan_workshop_ids = [];
    dbUpdate.free_plan_reminder_ids = [];
    dbUpdate.free_plan_tire_id = null;
    dbUpdate.free_plan_wheel_id = null;
  }

  const { error } = await supabase
    .from("entitlements")
    .update(dbUpdate)
    .eq("user_id", userId);

  if (error) {
    if (error.code === "PGRST116") {
      return new Response(
        JSON.stringify({
          received: true,
          message: "User entitlements row not found (user may not exist yet)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.error("Entitlements update failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update entitlements" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      received: true,
      updated: userId,
      plan: update.plan,
      premium_until: update.premium_until ?? undefined,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
