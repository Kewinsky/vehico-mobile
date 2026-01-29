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
  currency?: string;
  includeServiceEntries?: boolean;
  includeFuelingStats?: boolean;
  includeServiceStats?: boolean;
  includeNotes?: boolean;
  publicReportUrl?: string | null;
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

interface FuelingEntry {
  date: string;
  distance: number;
  fuel_amount: number;
  fuel_cost: number;
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
  lang: "en" | "pl",
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
    upgrade: { en: "Upgrade", pl: "Ulepszenie " },
    oil_engine: { en: "Oil", pl: "Olej" },
    other: { en: "Other", pl: "Inne" },
  };
  return labels[category]?.[lang] || category;
}

function formatServiceHistory(
  entries: ServiceEntry[],
  lang: "en" | "pl",
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

function calculateFuelingStats(
  entries: FuelingEntry[],
  lang: "en" | "pl",
): {
  totalDistance: number;
  totalFuel: number;
  totalCost: number;
  avgConsumption: number;
  entryCount: number;
} {
  if (entries.length === 0) {
    return {
      totalDistance: 0,
      totalFuel: 0,
      totalCost: 0,
      avgConsumption: 0,
      entryCount: 0,
    };
  }

  const totalDistance = entries.reduce((sum, e) => sum + (e.distance || 0), 0);
  const totalFuel = entries.reduce((sum, e) => sum + (e.fuel_amount || 0), 0);
  const totalCost = entries.reduce((sum, e) => sum + (e.fuel_cost || 0), 0);
  const avgConsumption =
    totalDistance > 0 ? (totalFuel / totalDistance) * 100 : 0;

  return {
    totalDistance,
    totalFuel,
    totalCost,
    avgConsumption,
    entryCount: entries.length,
  };
}

function calculateServiceStats(
  entries: ServiceEntry[],
  lang: "en" | "pl",
): {
  totalCost: number;
  entryCount: number;
  byCategory: Record<string, number>;
} {
  if (entries.length === 0) {
    return { totalCost: 0, entryCount: 0, byCategory: {} };
  }

  const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0);
  const byCategory: Record<string, number> = {};
  entries.forEach((e) => {
    const cat = e.category || "other";
    byCategory[cat] = (byCategory[cat] || 0) + (e.cost || 0);
  });

  return {
    totalCost,
    entryCount: entries.length,
    byCategory,
  };
}

function formatFuelingStats(
  stats: ReturnType<typeof calculateFuelingStats>,
  currency: string,
  lang: "en" | "pl",
): string {
  if (stats.entryCount === 0) {
    return lang === "pl" ? "Brak danych o tankowaniach." : "No fueling data.";
  }

  const isPL = lang === "pl";
  const lines: string[] = [];

  if (stats.totalDistance > 0) {
    lines.push(
      `${isPL ? "Całkowity przebieg" : "Total distance"}: ${stats.totalDistance.toLocaleString()} km`,
    );
  }
  if (stats.totalFuel > 0) {
    lines.push(
      `${isPL ? "Całkowite paliwo" : "Total fuel"}: ${stats.totalFuel.toFixed(2)} L`,
    );
  }
  if (stats.avgConsumption > 0) {
    lines.push(
      `${isPL ? "Średnie spalanie" : "Average consumption"}: ${stats.avgConsumption.toFixed(2)} L/100km`,
    );
  }
  if (stats.totalCost > 0) {
    lines.push(
      `${isPL ? "Całkowity koszt paliwa" : "Total fuel cost"}: ${stats.totalCost.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )} ${currency}`,
    );
  }

  return lines.join("\n");
}

function formatServiceStats(
  stats: ReturnType<typeof calculateServiceStats>,
  currency: string,
  lang: "en" | "pl",
): string {
  if (stats.entryCount === 0) {
    return lang === "pl" ? "Brak danych o serwisach." : "No service data.";
  }

  const isPL = lang === "pl";
  const lines: string[] = [];

  lines.push(
    `${isPL ? "Liczba wpisów serwisowych" : "Number of service entries"}: ${stats.entryCount}`,
  );
  if (stats.totalCost > 0) {
    lines.push(
      `${isPL ? "Całkowity koszt serwisów" : "Total service cost"}: ${stats.totalCost.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )} ${currency}`,
    );
  }

  const categoryLabels: Record<string, { en: string; pl: string }> = {
    maintenance: { en: "Maintenance", pl: "Serwis" },
    repair: { en: "Repair", pl: "Naprawa" },
    inspection: { en: "Inspection", pl: "Przegląd" },
    upgrade: { en: "Upgrade", pl: "Ulepszenie" },
    oil_engine: { en: "Oil", pl: "Olej" },
    other: { en: "Other", pl: "Inne" },
  };

  const categories = Object.entries(stats.byCategory)
    .filter(([_, cost]) => cost > 0)
    .sort(([_, a], [__, b]) => b - a);

  if (categories.length > 0) {
    lines.push("");
    lines.push(isPL ? "Koszty według kategorii:" : "Costs by category:");
    categories.forEach(([cat, cost]) => {
      const label = categoryLabels[cat]?.[lang] || cat;
      lines.push(
        `  ${label}: ${cost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${currency}`,
      );
    });
  }

  return lines.join("\n");
}

function generateMarketplacePost(
  vehicle: VehicleData,
  serviceEntries: ServiceEntry[],
  fuelingEntries: FuelingEntry[],
  language: "en" | "pl",
  price: number | null,
  currency: string = "PLN",
  options: {
    includeServiceEntries: boolean;
    includeFuelingStats: boolean;
    includeServiceStats: boolean;
    includeNotes: boolean;
    publicReportUrl: string | null;
  },
): string {
  const isPL = language === "pl";

  // Get last mileage from service entries
  const lastMileage =
    serviceEntries
      .filter((e) => e.mileage !== null)
      .sort((a, b) => (b.mileage || 0) - (a.mileage || 0))[0]?.mileage || null;

  const sections: string[] = [];

  // FOR SALE section
  const forSaleTitle = isPL ? "=== SPRZEDAM ===" : "=== FOR SALE ===";
  const power = formatValue(vehicle.power_hp, isPL ? "moc" : "power");
  const powerUnit = isPL ? "KM" : "HP";
  const vehicleInfo = isPL
    ? `${vehicle.make} ${vehicle.model} z ${vehicle.production_year} roku o mocy ${power}${powerUnit}`
    : `${vehicle.make} ${vehicle.model} from ${vehicle.production_year} year with ${power}${powerUnit}`;
  const vinLine = vehicle.vin ? `VIN: ${vehicle.vin}` : null;
  const priceLine =
    price !== null && price > 0
      ? `${isPL ? "Cena" : "Price"}: ${price.toLocaleString()} ${currency}`
      : null;

  const forSaleLines = [forSaleTitle, vehicleInfo];
  if (vinLine) forSaleLines.push(vinLine);
  if (priceLine) forSaleLines.push(priceLine);
  sections.push(forSaleLines.join("\n"));

  // Technical specification (always included)
  const specTitle = isPL
    ? "SPECYFIKACJA TECHNICZNA"
    : "TECHNICAL SPECIFICATION";
  const spec = `=== ${specTitle} ===
${isPL ? "Rok produkcji" : "Production year"}: ${vehicle.production_year}
${isPL ? "Pojemność silnika" : "Engine capacity"}: ${formatValue(
    vehicle.engine_capacity,
    isPL ? "pojemnosc_silnika" : "engine_capacity",
  )} cm³
${isPL ? "Moc" : "Power"}: ${formatValue(
    vehicle.power_hp,
    isPL ? "moc" : "power",
  )} ${isPL ? "KM" : "HP"}
${isPL ? "Rodzaj paliwa" : "Fuel type"}: ${getFuelTypeLabel(
    vehicle.fuel_type,
    language,
  )}
${isPL ? "Skrzynia biegów" : "Transmission"}: ${getTransmissionLabel(
    vehicle.transmission,
    language,
  )}
${isPL ? "Przebieg" : "Mileage"}: ${formatValue(
    lastMileage,
    isPL ? "przebieg" : "mileage",
  )} km`;
  sections.push(spec);

  // Service history (if included)
  if (options.includeServiceEntries) {
    const historyTitle = isPL ? "HISTORIA SERWISOWA" : "SERVICE HISTORY";
    const history = `=== ${historyTitle} ===
${formatServiceHistory(serviceEntries, language)}`;
    sections.push(history);
  }

  // Fueling statistics (if included)
  if (options.includeFuelingStats) {
    const fuelingStats = calculateFuelingStats(fuelingEntries, language);
    const statsTitle = isPL ? "STATYSTYKI TANKOWAŃ" : "FUELING STATISTICS";
    const stats = `=== ${statsTitle} ===
${formatFuelingStats(fuelingStats, currency, language)}`;
    sections.push(stats);
  }

  // Service statistics (if included)
  if (options.includeServiceStats) {
    const serviceStats = calculateServiceStats(serviceEntries, language);
    const statsTitle = isPL ? "STATYSTYKI SERWISOWE" : "SERVICE STATISTICS";
    const stats = `=== ${statsTitle} ===
${formatServiceStats(serviceStats, currency, language)}`;
    sections.push(stats);
  }

  // Notes (if included)
  if (options.includeNotes && vehicle.notes) {
    const notesTitle = isPL ? "NOTATKI" : "NOTES";
    const notesSection = `=== ${notesTitle} ===
${vehicle.notes}`;
    sections.push(notesSection);
  }

  // Public report link (if provided)
  if (options.publicReportUrl) {
    const reportTitle = isPL ? "RAPORT ONLINE" : "ONLINE REPORT";
    const reportSection = `=== ${reportTitle} ===
${isPL ? "Szczegółowy raport dostępny pod adresem:" : "Detailed report available at:"}
${options.publicReportUrl}`;
    sections.push(reportSection);
  }

  return sections.join("\n\n");
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
      },
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

    const {
      vehicleId,
      language,
      price,
      currency = "PLN",
      includeServiceEntries = true,
      includeFuelingStats = false,
      includeServiceStats = false,
      includeNotes = false,
      publicReportUrl = null,
    }: GenerateRequest = await req.json();

    if (!vehicleId || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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

    // Fetch service entries (if needed)
    let serviceEntries: ServiceEntry[] = [];
    if (includeServiceEntries || includeServiceStats) {
      const { data } = await supabaseClient
        .from("service_entries")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false });
      serviceEntries = (data || []) as ServiceEntry[];
    }

    // Fetch fueling entries (if stats needed)
    let fuelingEntries: FuelingEntry[] = [];
    if (includeFuelingStats) {
      const { data } = await supabaseClient
        .from("fueling_entries")
        .select("date, distance, fuel_amount, fuel_cost")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false });
      fuelingEntries = (data || []) as FuelingEntry[];
    }

    // Generate post
    const content = generateMarketplacePost(
      vehicle as VehicleData,
      serviceEntries,
      fuelingEntries,
      language,
      price ?? null,
      currency,
      {
        includeServiceEntries,
        includeFuelingStats,
        includeServiceStats,
        includeNotes,
        publicReportUrl,
      },
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
      },
    );
  }
});
