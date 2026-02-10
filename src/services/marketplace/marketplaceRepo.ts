import { supabase } from "../supabase/client";
import type { MarketplacePost } from "../../types/domain";

export type MarketplaceReportOptions = {
  include_technical_data: boolean;
  include_insurance: boolean;
  include_inspection: boolean;
  include_notes: boolean;
  include_wheels: boolean;
  include_tires: boolean;
  include_service_history: boolean;
  include_service_stats: boolean;
  include_fueling_stats: boolean;
};

type GenerateMarketplacePostInput = {
  vehicleId: string;
  reportOptions: MarketplaceReportOptions;
  includePrice: boolean;
  price: number | null;
  currency: string;
  includePublicReport: boolean;
  publicReportUrl: string | null;
};

type SaveMarketplacePostInput = {
  vehicleId: string;
  platform?: "olx" | "facebook" | "generic";
  price?: number | null;
  content: { pl: string; en: string };
};

export async function generateMarketplacePost(
  input: GenerateMarketplacePostInput,
): Promise<{ pl: string; en: string }> {
  const ro = input.reportOptions;
  const { data, error } = await supabase.functions.invoke(
    "generate-marketplace-post",
    {
      body: {
        vehicleId: input.vehicleId,
        price: input.includePrice ? input.price : null,
        currency: input.currency,
        includePrice: input.includePrice,
        includeServiceHistory: ro.include_service_history,
        includeServiceEntries: ro.include_service_history,
        includeFuelingStats: ro.include_fueling_stats,
        includeServiceStats: ro.include_service_stats,
        includeWheelsTires: ro.include_wheels || ro.include_tires,
        includeWheels: ro.include_wheels,
        includeTires: ro.include_tires,
        includeNotes: ro.include_notes,
        includeInsurance: ro.include_insurance,
        includeInspection: ro.include_inspection,
        publicReportUrl: input.includePublicReport ? input.publicReportUrl : null,
      },
    },
  );

  if (error) throw error;
  if (!data?.content) {
    throw new Error("Failed to generate marketplace post");
  }

  return data.content as { pl: string; en: string };
}

/**
 * Resolves marketplace post content to display string.
 * @param content Content object or legacy string (for backward compat)
 * @param language Preferred language
 */
export function resolveMarketplacePostContent(
  content: { pl: string; en: string } | string,
  language: "pl" | "en",
): string {
  if (typeof content === "object" && content?.pl != null && content?.en != null) {
    return content[language];
  }
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (parsed && typeof parsed === "object" && "pl" in parsed && "en" in parsed) {
        return (parsed as { pl: string; en: string })[language];
      }
    } catch {
      return content;
    }
  }
  return "";
}

export async function saveMarketplacePost(
  input: SaveMarketplacePostInput,
): Promise<MarketplacePost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  // Use RPC function that checks entitlements and consumes listing
  const { data, error } = await supabase.rpc("create_marketplace_post", {
    p_vehicle_id: input.vehicleId,
    p_platform: input.platform ?? "generic",
    p_price: input.price ?? null,
    p_content: input.content,
  });

  if (error) throw error;
  return data as MarketplacePost;
}

export async function updateMarketplacePost(
  postId: string,
  content: { pl: string; en: string },
): Promise<MarketplacePost> {
  const { data, error } = await supabase
    .from("posts")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .select("*")
    .single();

  if (error) throw error;
  return data as MarketplacePost;
}

export async function listMarketplacePosts(
  vehicleId: string,
): Promise<MarketplacePost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MarketplacePost[];
}

export async function getMarketplacePost(
  postId: string,
): Promise<MarketplacePost> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error) throw error;
  return data as MarketplacePost;
}

export async function updateMarketplacePostTitle(
  postId: string,
  title: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ title })
    .eq("id", postId);
  if (error) throw error;
}
