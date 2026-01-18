import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  vehicleId: string;
  language: "en" | "pl";
  price?: number | null;
}

interface VehicleData {
  id: string;
  type: "car" | "motorcycle";
  title: string;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
  engine_capacity: number | null;
  power_hp: number | null;
  fuel_type: "petrol" | "diesel" | "hybrid" | "electric" | "lpg" | null;
  transmission: "manual" | "automatic" | null;
  notes: string | null;
}

interface ServiceEntry {
  service_date: string;
  mileage: number | null;
  category: string;
  title: string;
  description: string;
  cost: number | null;
}

function formatValue(value: any, placeholder: string): string {
  if (value === null || value === undefined || value === "") {
    return `[${placeholder}]`;
  }
  return String(value);
}

function getFuelTypeLabel(fuelType: string | null, lang: "en" | "pl"): string {
  if (!fuelType) return `[${lang === "pl" ? "rodzaj_paliwa" : "fuel_type"}]`;
  const labels: Record<string, { en: string; pl: string }> = {
    petrol: { en: "Petrol", pl: "Benzyna" },
    diesel: { en: "Diesel", pl: "Diesel" },
    hybrid: { en: "Hybrid", pl: "Hybryda" },
    electric: { en: "Electric", pl: "Elektryczny" },
    lpg: { en: "LPG", pl: "LPG" },
  };
  return labels[fuelType]?.[lang] || fuelType;
}

function getTransmissionLabel(
  transmission: string | null,
  lang: "en" | "pl"
): string {
  if (!transmission)
    return `[${lang === "pl" ? "skrzynia_biegow" : "transmission"}]`;
  const labels: Record<string, { en: string; pl: string }> = {
    manual: { en: "Manual", pl: "Manualna" },
    automatic: { en: "Automatic", pl: "Automatyczna" },
  };
  return labels[transmission]?.[lang] || transmission;
}

function getTypeLabel(type: string, lang: "en" | "pl"): string {
  if (type === "car") {
    return lang === "pl" ? "Samochód osobowy" : "Car";
  }
  return lang === "pl" ? "Motocykl" : "Motorcycle";
}

function getCategoryLabel(category: string, lang: "en" | "pl"): string {
  const labels: Record<string, { en: string; pl: string }> = {
    maintenance: { en: "Maintenance", pl: "Serwis" },
    repair: { en: "Repair", pl: "Naprawa" },
    inspection: { en: "Inspection", pl: "Przegląd" },
    upgrade: { en: "Upgrade", pl: "Ulepszenie" },
    other: { en: "Other", pl: "Inne" },
  };
  return labels[category]?.[lang] || category;
}

function formatServiceHistory(
  entries: ServiceEntry[],
  lang: "en" | "pl"
): string {
  if (entries.length === 0) {
    return lang === "pl" ? "Brak wpisów serwisowych." : "No service history.";
  }

  return entries
    .map((entry) => {
      const date = entry.service_date.slice(0, 10);
      const title = entry.title;
      const mileage = entry.mileage
        ? `${entry.mileage.toLocaleString()} km`
        : "";
      return [date, title, mileage].filter(Boolean).join(" | ");
    })
    .join("\n");
}

function generateMarketplacePost(
  vehicle: VehicleData,
  serviceEntries: ServiceEntry[],
  language: "en" | "pl",
  price: number | null
): string {
  const isPL = language === "pl";

  // Get last mileage from service entries
  const lastMileage =
    serviceEntries
      .filter((e) => e.mileage !== null)
      .sort((a, b) => (b.mileage || 0) - (a.mileage || 0))[0]?.mileage || null;

  // Title: SPRZEDAM: [marka] [model] · [rok_produkcji] · [moc]
  const power = formatValue(vehicle.power_hp, isPL ? "moc" : "power");
  const powerUnit = isPL ? "KM" : "HP";
  const title = isPL
    ? `SPRZEDAM: ${vehicle.make} ${vehicle.model} · ${vehicle.production_year} · ${power} ${powerUnit}`
    : `FOR SALE: ${vehicle.make} ${vehicle.model} · ${vehicle.production_year} · ${power} ${powerUnit}`;

  // Technical specification
  const specTitle = isPL
    ? "SPECYFIKACJA TECHNICZNA"
    : "TECHNICAL SPECIFICATION";
  const spec = `${specTitle}
${isPL ? "Pojemność silnika" : "Engine capacity"}: ${formatValue(
    vehicle.engine_capacity,
    isPL ? "pojemnosc_silnika" : "engine_capacity"
  )} cm³
${isPL ? "Moc" : "Power"}: ${formatValue(
    vehicle.power_hp,
    isPL ? "moc" : "power"
  )} ${isPL ? "KM" : "HP"}
${isPL ? "Rodzaj paliwa" : "Fuel type"}: ${getFuelTypeLabel(
    vehicle.fuel_type,
    language
  )}
${isPL ? "Skrzynia biegów" : "Transmission"}: ${getTransmissionLabel(
    vehicle.transmission,
    language
  )}
${isPL ? "Przebieg" : "Mileage"}: ${formatValue(
    lastMileage,
    isPL ? "przebieg" : "mileage"
  )} km`;

  // Service history
  const historyTitle = isPL ? "HISTORIA SERWISOWA" : "SERVICE HISTORY";
  const history = `${historyTitle}
${formatServiceHistory(serviceEntries, language)}`;

  return [title, "", spec, "", history].join("\n");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vehicleId, language, price }: GenerateRequest = await req.json();

    if (!vehicleId || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch vehicle data
    const { data: vehicle, error: vehicleError } = await supabaseClient
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ownership
    if (vehicle.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch service entries
    const { data: serviceEntries } = await supabaseClient
      .from("service_entries")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("service_date", { ascending: false });

    // Generate post
    const content = generateMarketplacePost(
      vehicle as VehicleData,
      (serviceEntries || []) as ServiceEntry[],
      language,
      price ?? null
    );

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
