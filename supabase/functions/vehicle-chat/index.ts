import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

import { createVehicleChatHandler } from "./handler.ts";

const handler = createVehicleChatHandler({
  getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
  hasPremiumAccess: async (req) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !authorization) return false;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data, error } = await supabase.rpc("check_premium_feature", {
      p_feature: "ai",
    });

    return !error && data?.allowed === true;
  },
  fetch,
});

export default {
  fetch: withSupabase({ auth: "user" }, handler),
};
