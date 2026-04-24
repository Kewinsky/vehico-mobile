/**
 * Sync Supabase entitlements from RevenueCat after Restore (or manual sync).
 *
 * Called by the app with the user's JWT. Fetches current subscriber info from
 * RevenueCat API and updates the entitlements row to match.
 *
 * Required secret: REVENUECAT_SECRET_API_KEY (RevenueCat Dashboard → API keys → Secret key).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PREMIUM_ENTITLEMENT_ID = "vehico Premium";
const PRODUCT_ID_LIFETIME = "lifetime";
const PRODUCT_IDS_SUBSCRIPTION = ["monthly", "yearly"] as const;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EntitlementPlan = "free" | "premium" | "lifetime";

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
  const lower = productId.toLowerCase();
  return lower === PRODUCT_ID_LIFETIME || lower.includes("lifetime");
}

function normalizeProductId(productId: string | undefined): string | null {
  if (!productId) return null;
  const lower = productId.toLowerCase();
  if (lower === "lifetime" || lower.includes("lifetime")) return "lifetime";
  if (lower === "monthly" || lower.startsWith("monthly")) return "monthly";
  if (lower === "yearly" || lower.startsWith("yearly")) return "yearly";
  return null;
}

interface RCSubscriberEntitlement {
  expires_date: string | null;
  product_identifier?: string;
}

interface RCSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RCSubscriberEntitlement>;
  };
}

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

function buildUpdateFromRC(rc: RCSubscriberResponse): EntitlementsUpdate {
  const ent = rc.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];
  if (!ent) {
    return {
      plan: "free",
      premium_until: null,
      product_id: null,
      ...FREE_LIMITS,
    };
  }

  const expiresDate = ent.expires_date;
  const now = new Date();
  const isExpired =
    expiresDate != null && new Date(expiresDate) <= now;

  if (isExpired) {
    return {
      plan: "free",
      premium_until: null,
      product_id: null,
      ...FREE_LIMITS,
    };
  }

  const productId = normalizeProductId(ent.product_identifier);
  const premiumUntil =
    expiresDate != null ? new Date(expiresDate).toISOString() : null;

  if (isLifetimeProduct(ent.product_identifier)) {
    return {
      plan: "lifetime",
      premium_until: null,
      product_id: productId ?? "lifetime",
      ...PREMIUM_LIMITS,
    };
  }

  return {
    plan: "premium",
    premium_until: premiumUntil,
    product_id: productId,
    ...PREMIUM_LIMITS,
  };
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
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rcSecretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !rcSecretKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const appUserId = user.id;
  const encodedUserId = encodeURIComponent(appUserId);

  let rcResponse: Response;
  try {
    rcResponse = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodedUserId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${rcSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to fetch subscription status" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!rcResponse.ok) {
    return new Response(
      JSON.stringify({ error: "RevenueCat error", status: rcResponse.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let rcBody: RCSubscriberResponse;
  try {
    rcBody = (await rcResponse.json()) as RCSubscriberResponse;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid response from RevenueCat" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const update = buildUpdateFromRC(rcBody);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const now = new Date().toISOString();
  const {
    data: currentEntitlements,
    error: currentEntitlementsError,
  } = await supabase
    .from("entitlements")
    .select("free_plan_vehicle_id")
    .eq("user_id", appUserId)
    .maybeSingle();
  if (currentEntitlementsError) {
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
      appUserId,
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
    .eq("user_id", appUserId);

  if (error) {
    if (error.code === "PGRST116") {
      return new Response(
        JSON.stringify({ error: "Entitlements row not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Failed to update entitlements" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      plan: update.plan,
      premium_until: update.premium_until ?? undefined,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
