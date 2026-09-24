import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { createVehicleChatHandler } from "./handler.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const handler = createVehicleChatHandler({
      getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
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
      fetch,
    });

    return handler(req);
  }),
};
