import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

import { createVehicleChatHandler } from "./handler.ts";

const handler = createVehicleChatHandler({
  getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
  fetch,
});

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, handler),
};
