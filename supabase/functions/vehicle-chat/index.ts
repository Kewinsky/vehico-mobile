import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import {
  createVehicleChatHandler,
  MAX_CONTEXT_ROWS_PER_COLLECTION,
  MAX_RECENT_SERVICE_AND_FUEL_ROWS,
} from "./handler.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
      authenticateUser: async () => {
        const {
          data: { user },
          error,
        } = await ctx.supabase.auth.getUser();

        if (error || !user) return null;
        return user.id;
      },
      hasPremiumAccess: async () => {
        const { data, error } = await ctx.supabase.rpc(
          "check_premium_feature",
          { p_feature: "ai" },
        );

        if (
          error ||
          typeof data !== "object" ||
          data === null ||
          !("allowed" in data) ||
          typeof data.allowed !== "boolean"
        ) {
          throw error ?? new Error("Invalid premium access response");
        }

        return data.allowed;
      },
      loadVehicleContext: async ({ userId, vehicleId }) => {
        const { data: vehicle, error: vehicleError } = await ctx.supabase
          .from("vehicles")
          .select(
            "id,owner_id,type,make,model,production_year,initial_mileage,mileage,mileage_updated_at,first_registration_date,engine_capacity,power_hp,fuel_type,transmission,drive_type,notes,insurance_valid_until,ac_valid_until,inspection_valid_until,intake_enabled",
          )
          .eq("id", vehicleId)
          .eq("owner_id", userId)
          .maybeSingle();

        if (vehicleError) throw vehicleError;
        if (!vehicle) return { vehicle: null, serviceHistory: [] };

        const limit = MAX_CONTEXT_ROWS_PER_COLLECTION + 1;
        const [
          serviceHistoryResult,
          fuelingEntriesResult,
          remindersResult,
          tiresResult,
          wheelsResult,
          equipmentResult,
          workshopsResult,
        ] = await Promise.all([
          ctx.supabase
            .from("service_entries")
            .select(
              "id,vehicle_id,service_date,mileage,title,cost,workshop_id,workshop_snapshot,status",
            )
            .eq("vehicle_id", vehicleId)
            .eq("status", "approved")
            .order("service_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(MAX_RECENT_SERVICE_AND_FUEL_ROWS),
          ctx.supabase
            .from("fueling_entries")
            .select("date,fuel_cost,fuel_type,gas_station,distance")
            .eq("vehicle_id", vehicleId)
            .order("date", { ascending: false })
            .limit(MAX_RECENT_SERVICE_AND_FUEL_ROWS),
          ctx.supabase
            .from("reminders")
            .select(
              "id,vehicle_id,due_date,due_mileage,days_before,title,notes,status,channel_email,channel_push,enabled,delivered_at,recurrence_interval_value,recurrence_interval_unit,recurrence_interval_km,recurrence_anchor_mileage",
            )
            .eq("vehicle_id", vehicleId)
            .order("created_at", { ascending: false })
            .limit(limit),
          ctx.supabase
            .from("tires")
            .select(
              "id,vehicle_id,name,width_mm,aspect_ratio,diameter_inch,tire_type,dot,is_currently_fitted",
            )
            .eq("vehicle_id", vehicleId)
            .order("created_at", { ascending: false })
            .limit(limit),
          ctx.supabase
            .from("wheels")
            .select(
              "id,vehicle_id,name,width_inch,diameter_inch,et_offset,bolt_pattern,center_bore_mm,bolt_type,weight_kg,is_currently_fitted",
            )
            .eq("vehicle_id", vehicleId)
            .order("created_at", { ascending: false })
            .limit(limit),
          ctx.supabase
            .from("vehicle_equipment")
            .select("id,vehicle_id,preset_key,label")
            .eq("vehicle_id", vehicleId)
            .order("created_at", { ascending: true })
            .limit(limit),
          ctx.supabase
            .from("workshops")
            .select("id,name,workshop_type,phone_number,address")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit),
        ]);

        const results = [
          serviceHistoryResult,
          fuelingEntriesResult,
          remindersResult,
          tiresResult,
          wheelsResult,
          equipmentResult,
          workshopsResult,
        ];
        const failedResult = results.find((result) => result.error);
        if (failedResult?.error) throw failedResult.error;

        return {
          vehicle,
          serviceHistory: serviceHistoryResult.data ?? [],
          fuelingEntries: fuelingEntriesResult.data ?? [],
          reminders: remindersResult.data ?? [],
          tires: tiresResult.data ?? [],
          wheels: wheelsResult.data ?? [],
          equipment: equipmentResult.data ?? [],
          workshops: workshopsResult.data ?? [],
        };
      },
      fetch,
    });

    return handler(req);
  }),
};
