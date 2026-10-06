import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { createServiceInvoiceImportHandler } from "./handler.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const handler = createServiceInvoiceImportHandler({
      getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
      authenticateUser: async () => {
        const {
          data: { user },
          error,
        } = await ctx.supabase.auth.getUser();
        return error || !user ? null : user.id;
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
      vehicleBelongsToUser: async ({ userId, vehicleId }) => {
        const { data, error } = await ctx.supabase
          .from("vehicles")
          .select("id")
          .eq("id", vehicleId)
          .eq("owner_id", userId)
          .maybeSingle();
        if (error) throw error;
        return data !== null;
      },
      fetch,
    });

    return handler(req);
  }),
};
