/**
 * Cron job: delete vehicles hidden on free plan after 90-day retention.
 * Run daily via Supabase cron or manually with CRON_SECRET.
 *
 * Finds users with plan = 'free', downgraded_at < now() - 90 days,
 * and free_plan_vehicle_id set; deletes their vehicles where id != free_plan_vehicle_id.
 * CASCADE removes related tires, wheels, photos, reminders, etc.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETENTION_DAYS = 90;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (cronSecret && bearer !== cronSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoff.toISOString();

    const { data: rows, error: selectError } = await admin
      .from("entitlements")
      .select("user_id, free_plan_vehicle_id")
      .eq("plan", "free")
      .not("downgraded_at", "is", null)
      .lt("downgraded_at", cutoffIso)
      .not("free_plan_vehicle_id", "is", null);

    if (selectError) {
      return new Response(
        JSON.stringify({ error: "entitlements select failed", details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalDeleted = 0;
    const errors: string[] = [];

    for (const row of rows ?? []) {
      const userId = row.user_id as string;
      const keepVehicleId = row.free_plan_vehicle_id as string;

      const { data: toDelete, error: listError } = await admin
        .from("vehicles")
        .select("id")
        .eq("owner_id", userId)
        .neq("id", keepVehicleId);

      if (listError) {
        errors.push(`user ${userId}: list vehicles failed: ${listError.message}`);
        continue;
      }

      const ids = (toDelete ?? []).map((v) => v.id);
      if (ids.length === 0) continue;

      const { error: deleteError } = await admin
        .from("vehicles")
        .delete()
        .in("id", ids);

      if (deleteError) {
        errors.push(`user ${userId}: delete failed: ${deleteError.message}`);
      } else {
        totalDeleted += ids.length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cutoff: cutoffIso,
        users_processed: (rows ?? []).length,
        vehicles_deleted: totalDeleted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
