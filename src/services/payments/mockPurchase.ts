import { supabase } from "../supabase/client";
import type { EntitlementPlan } from "../../app/providers/EntitlementsProvider";

export type ProductId =
  | "pack_3_reports"
  | "pack_3_listings"
  | "pack_3plus3"
  | "premium_monthly"
  | "premium_yearly"
  | "lifetime";

export type Product = {
  id: ProductId;
  name: string;
  namePl: string;
  description: string;
  descriptionPl: string;
  price: string; // Display price, e.g. "9.99 PLN"
  type: "consumable" | "subscription" | "lifetime";
};

export const PRODUCTS: Product[] = [
  {
    id: "pack_3_reports",
    name: "3 Reports Pack",
    namePl: "Paczka 3 raportów",
    description: "Generate 3 public reports",
    descriptionPl: "Wygeneruj 3 raporty publiczne",
    price: "9.99 PLN",
    type: "consumable",
  },
  {
    id: "pack_3_listings",
    name: "3 Posts Pack",
    namePl: "Paczka 3 ogłoszeń",
    description: "Generate 3 marketplace posts",
    descriptionPl: "Wygeneruj 3 ogłoszenia",
    price: "9.99 PLN",
    type: "consumable",
  },
  {
    id: "pack_3plus3",
    name: "3 Reports + 3 Posts",
    namePl: "3 raporty + 3 ogłoszenia",
    description: "Generate 3 reports and 3 posts",
    descriptionPl: "Wygeneruj 3 raporty i 3 ogłoszenia",
    price: "14.99 PLN",
    type: "consumable",
  },
  {
    id: "premium_monthly",
    name: "Premium Monthly",
    namePl: "Premium miesięcznie",
    description: "Unlimited reports, posts, vehicles, and more",
    descriptionPl: "Nielimitowane raporty, ogłoszenia, pojazdy i więcej",
    price: "14.99 PLN/month",
    type: "subscription",
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    namePl: "Premium rocznie",
    description: "Unlimited everything - best value",
    descriptionPl: "Nielimitowane wszystko - najlepsza cena",
    price: "99 PLN/year",
    type: "subscription",
  },
  {
    id: "lifetime",
    name: "Lifetime Premium",
    namePl: "Premium na zawsze",
    description: "One-time payment, lifetime access",
    descriptionPl: "Jednorazowa płatność, dostęp na zawsze",
    price: "199 PLN",
    type: "lifetime",
  },
];

/**
 * Mock purchase function - simulates a purchase without real IAP
 * In production, this will be replaced with real IAP integration
 */
export async function mockPurchase(productId: ProductId): Promise<void> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }

  // Update entitlements based on product type
  const { data: currentEntitlements, error: fetchError } = await supabase
    .from("entitlements")
    .select("*")
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch entitlements: ${fetchError.message}`);
  }

  let updates: Partial<{
    plan: EntitlementPlan;
    reports_remaining: number;
    listings_remaining: number;
    vehicles_limit: number;
    photos_per_vehicle_limit: number;
    tires_per_vehicle_limit: number;
    wheels_per_vehicle_limit: number;
    workshops_limit: number;
    reminders_limit: number;
    premium_until: string | null;
  }> = {};

  switch (product.type) {
    case "consumable":
      if (productId === "pack_3_reports") {
        updates.reports_remaining =
          (currentEntitlements.reports_remaining ?? 0) + 3;
      } else if (productId === "pack_3_listings") {
        updates.listings_remaining =
          (currentEntitlements.listings_remaining ?? 0) + 3;
      } else if (productId === "pack_3plus3") {
        updates.reports_remaining =
          (currentEntitlements.reports_remaining ?? 0) + 3;
        updates.listings_remaining =
          (currentEntitlements.listings_remaining ?? 0) + 3;
      }
      break;

    case "subscription":
      updates.plan = "premium";
      if (productId === "premium_monthly") {
        const until = new Date();
        until.setMonth(until.getMonth() + 1);
        updates.premium_until = until.toISOString();
      } else if (productId === "premium_yearly") {
        const until = new Date();
        until.setFullYear(until.getFullYear() + 1);
        updates.premium_until = until.toISOString();
      }
      // Set unlimited limits
      updates.vehicles_limit = 999;
      updates.photos_per_vehicle_limit = 40;
      updates.tires_per_vehicle_limit = 999;
      updates.wheels_per_vehicle_limit = 999;
      updates.workshops_limit = 999;
      updates.reminders_limit = 999;
      break;

    case "lifetime":
      updates.plan = "lifetime";
      updates.premium_until = null;
      // Set unlimited limits
      updates.vehicles_limit = 999;
      updates.photos_per_vehicle_limit = 40;
      updates.tires_per_vehicle_limit = 999;
      updates.wheels_per_vehicle_limit = 999;
      updates.workshops_limit = 999;
      updates.reminders_limit = 999;
      break;
  }

  const { error: updateError } = await supabase
    .from("entitlements")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", currentEntitlements.user_id);

  if (updateError) {
    throw new Error(`Failed to update entitlements: ${updateError.message}`);
  }
}
