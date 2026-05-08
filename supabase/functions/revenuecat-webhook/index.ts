/**
 * RevenueCat → Supabase entitlements sync (webhook handler).
 * Authoritative writer for plan / limits / free-plan fields on `public.entitlements`.
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

import {
  applyRevenueCatEntitlementUpdate,
  type EntitlementsUpdate,
  PREMIUM_TIER_ENTITLEMENT_LIMITS,
  FREE_TIER_ENTITLEMENT_LIMITS,
} from "../_shared/applyRevenueCatEntitlementUpdate.ts";

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
    (id) => productId === id || productId.startsWith(`${id}:`),
  );
}

/** Resolve Supabase user_id from event (app_user_id or TRANSFER destination). */
function getTargetUserId(event: RevenueCatWebhookEvent): string | null {
  if (event.app_user_id) return event.app_user_id;
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

/** Build entitlements update from event type and payload. */
function getEntitlementsUpdate(
  event: RevenueCatWebhookEvent,
): EntitlementsUpdate | null {
  const type = event.type;
  const productId = event.product_id;
  const expirationAtMs = event.expiration_at_ms;

  switch (type) {
    case "TEST":
      return null;

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
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
        };
      }
      if (isSubscriptionProduct(productId) && expirationAtMs != null) {
        const premiumUntil = new Date(expirationAtMs).toISOString();
        return {
          plan: "premium",
          premium_until: premiumUntil,
          product_id: normalizedProduct,
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
        };
      }
      if (expirationAtMs != null) {
        return {
          plan: "premium",
          premium_until: new Date(expirationAtMs).toISOString(),
          product_id: normalizedProduct,
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
        };
      }
      if (event.entitlement_ids?.includes(PREMIUM_ENTITLEMENT_ID)) {
        return {
          plan: "premium",
          premium_until: null,
          product_id: normalizedProduct,
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
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
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
        };
      }
      return {
        plan: "free",
        premium_until: null,
        product_id: null,
        ...FREE_TIER_ENTITLEMENT_LIMITS,
      };

    case "EXPIRATION":
      return {
        plan: "free",
        premium_until: null,
        product_id: null,
        ...FREE_TIER_ENTITLEMENT_LIMITS,
      };

    case "TRANSFER": {
      const normalized = normalizeProductId(productId);
      if (isLifetimeProduct(productId)) {
        return {
          plan: "lifetime",
          premium_until: null,
          product_id: normalized ?? "lifetime",
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
        };
      }
      if (expirationAtMs != null) {
        return {
          plan: "premium",
          premium_until: new Date(expirationAtMs).toISOString(),
          product_id: normalized,
          ...PREMIUM_TIER_ENTITLEMENT_LIMITS,
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
  if (!expectedSecret) {
    console.error("REVENUECAT_WEBHOOK_AUTHORIZATION is not set");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const expectedAuth = expectedSecret.startsWith("Bearer ")
    ? expectedSecret
    : `Bearer ${expectedSecret}`;
  if (authHeader !== expectedAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = (await req.json()) as RevenueCatWebhookBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = body?.event;
  if (!event?.type) {
    return new Response(
      JSON.stringify({ error: "Missing event or event.type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[webhook] received event type:", event.type, "| product_id:", event.product_id ?? "n/a", "| env:", event.environment ?? "n/a", "| expiration_at_ms:", event.expiration_at_ms ?? "n/a", "| entitlement_ids:", JSON.stringify(event.entitlement_ids ?? []));

  const userId = getTargetUserId(event);
  console.log("[webhook] resolved userId:", userId ?? "null");
  if (!userId) {
    return new Response(
      JSON.stringify({
        received: true,
        message: "No target user id (e.g. TRANSFER without app_user_id)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const update = getEntitlementsUpdate(event);
  console.log("[webhook] resolved entitlementsUpdate:", update ? JSON.stringify({ plan: update.plan, premium_until: update.premium_until, product_id: update.product_id }) : "null (skipping)");
  if (!update) {
    return new Response(
      JSON.stringify({
        received: true,
        message: "No entitlement update for type",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: currentEntitlements, error: currentEntitlementsError } =
    await supabase
      .from("entitlements")
      .select("plan, free_plan_vehicle_id")
      .eq("user_id", userId)
      .maybeSingle();

  if (currentEntitlementsError) {
    console.error(
      "Failed to load current entitlements:",
      currentEntitlementsError,
    );
    return new Response(
      JSON.stringify({ error: "Failed to load current entitlements" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!currentEntitlements) {
    console.log("[webhook] no entitlements row found for userId:", userId);
    return new Response(
      JSON.stringify({
        received: true,
        message: "User entitlements row not found (user may not exist yet)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[webhook] current entitlements — plan:", currentEntitlements.plan, "| free_plan_vehicle_id:", currentEntitlements.free_plan_vehicle_id ?? "null");

  const { error: applyError } = await applyRevenueCatEntitlementUpdate(
    supabase,
    userId,
    update,
    currentEntitlements.free_plan_vehicle_id ?? null,
  );

  if (applyError) {
    console.error("Entitlements update failed:", applyError);
    return new Response(
      JSON.stringify({ error: "Failed to update entitlements" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[webhook] done — userId:", userId, "plan:", update.plan);

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
    },
  );
});
