import { supabase } from "../supabase/client";
import type { MarketplacePost, Language } from "../../types/domain";

type GenerateMarketplacePostInput = {
  vehicleId: string;
  language: Language;
  price?: number | null;
  currency?: string;
  includeServiceEntries?: boolean;
  includeFuelingStats?: boolean;
  includeServiceStats?: boolean;
  includeWheelsTires?: boolean;
  includeNotes?: boolean;
  publicReportUrl?: string | null;
};

type SaveMarketplacePostInput = {
  vehicleId: string;
  platform?: "olx" | "facebook" | "generic";
  language: Language;
  price?: number | null;
  content: string;
};

export async function generateMarketplacePost(
  input: GenerateMarketplacePostInput,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "generate-marketplace-post",
    {
      body: {
        vehicleId: input.vehicleId,
        language: input.language,
        price: input.price ?? null,
        currency: input.currency ?? "PLN",
        includeServiceEntries: input.includeServiceEntries ?? true,
        includeFuelingStats: input.includeFuelingStats ?? false,
        includeServiceStats: input.includeServiceStats ?? false,
        includeWheelsTires: input.includeWheelsTires ?? false,
        includeNotes: input.includeNotes ?? false,
        publicReportUrl: input.publicReportUrl ?? null,
      },
    },
  );

  if (error) throw error;
  if (!data?.content) {
    throw new Error("Failed to generate marketplace post");
  }

  return data.content;
}

export async function saveMarketplacePost(
  input: SaveMarketplacePostInput,
): Promise<MarketplacePost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("marketplace_posts")
    .insert({
      vehicle_id: input.vehicleId,
      user_id: user.id,
      platform: input.platform ?? "generic",
      language: input.language,
      price: input.price ?? null,
      content: input.content,
      title: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as MarketplacePost;
}

export async function updateMarketplacePost(
  postId: string,
  content: string,
): Promise<MarketplacePost> {
  const { data, error } = await supabase
    .from("marketplace_posts")
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
    .from("marketplace_posts")
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
    .from("marketplace_posts")
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
    .from("marketplace_posts")
    .update({ title })
    .eq("id", postId);
  if (error) throw error;
}
