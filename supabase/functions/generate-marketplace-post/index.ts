import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  vehicleId: string;
  price?: number | null;
  currency?: string;
  includePrice?: boolean;
  includeServiceEntries?: boolean;
  includeServiceHistory?: boolean;
  includeFuelingStats?: boolean;
  includeServiceStats?: boolean;
  includeWheelsTires?: boolean;
  includeWheels?: boolean;
  includeTires?: boolean;
  includeNotes?: boolean;
  includeInsurance?: boolean;
  includeInspection?: boolean;
  publicReportUrl?: string | null;
  // Deprecated, kept for backward compat
  language?: "en" | "pl";
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
  insurance_valid_until?: string | null;
  inspection_valid_until?: string | null;
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
  fuel_type?: string | null;
}

interface VehicleTire {
  name: string;
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  tire_type: string;
  dot: string | null;
  is_currently_fitted: boolean;
}

interface VehicleWheel {
  name: string;
  width_inch: number;
  diameter_inch: number;
  et_offset: number | null;
  bolt_pattern: string | null;
  center_bore_mm: number | null;
  bolt_type: string | null;
  weight_kg: number | null;
  is_currently_fitted: boolean;
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
    upgrade: { en: "Upgrade", pl: "Ulepszenie " },
    oil_engine: { en: "Oil", pl: "Olej" },
    other: { en: "Other", pl: "Inne" },
  };
  return labels[category]?.[lang] || category;
}

function getTireTypeLabel(tireType: string, lang: "en" | "pl"): string {
  const labels: Record<string, { en: string; pl: string }> = {
    summer: { en: "Summer", pl: "Letnia" },
    winter: { en: "Winter", pl: "Zimowa" },
    all_season: { en: "All-season", pl: "Wielosezonowa" },
    run_flat: { en: "Run-flat", pl: "Run-flat" },
    uhp: { en: "UHP (sport)", pl: "UHP (sportowa)" },
    suv_xl: { en: "SUV/XL (reinforced)", pl: "SUV/XL (wzmocniona)" },
  };
  return labels[tireType]?.[lang] || tireType;
}

function formatTireDimensions(
  widthMm: number,
  aspectRatio: number,
  diameterInch: number
): string {
  return `${widthMm}/${aspectRatio} R${diameterInch}`;
}

function formatWheelDimensions(
  widthInch: number,
  diameterInch: number
): string {
  return `${widthInch}J R${diameterInch}`;
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

function calculateFuelingStats(
  entries: FuelingEntry[],
  lang: "en" | "pl"
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
  lang: "en" | "pl"
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
  lang: "en" | "pl"
): string {
  if (stats.entryCount === 0) {
    return lang === "pl" ? "Brak danych o tankowaniach." : "No fueling data.";
  }

  const isPL = lang === "pl";
  const lines: string[] = [];

  if (stats.totalDistance > 0) {
    lines.push(
      `${
        isPL ? "Całkowity przebieg" : "Total distance"
      }: ${stats.totalDistance.toLocaleString()} km`
    );
  }
  if (stats.totalFuel > 0) {
    lines.push(
      `${isPL ? "Całkowite paliwo" : "Total fuel"}: ${stats.totalFuel.toFixed(
        2
      )} L`
    );
  }
  if (stats.avgConsumption > 0) {
    lines.push(
      `${
        isPL ? "Średnie spalanie" : "Average consumption"
      }: ${stats.avgConsumption.toFixed(2)} L/100km`
    );
  }
  if (stats.totalCost > 0) {
    lines.push(
      `${
        isPL ? "Całkowity koszt paliwa" : "Total fuel cost"
      }: ${stats.totalCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`
    );
  }

  return lines.join("\n");
}

type OilChangeData = {
  lastDate: string | null;
  lastMileage: number | null;
  avgKm: number;
  avgMonths: number;
};

function formatServiceStats(
  stats: ReturnType<typeof calculateServiceStats>,
  oil: OilChangeData,
  currency: string,
  lang: "en" | "pl"
): string {
  const isPL = lang === "pl";
  const lines: string[] = [];

  // 1. Ostatnia wymiana oleju
  if (oil.lastDate) {
    lines.push(
      `${isPL ? "Ostatnia wymiana oleju" : "Last oil change"}: ${oil.lastDate}`
    );
    if (oil.lastMileage != null) {
      lines.push(
        `${
          isPL ? "Przebieg" : "Mileage"
        }: ${oil.lastMileage.toLocaleString()} km`
      );
    }
  }

  // 2. Interwały olejowe
  if (Number.isFinite(oil.avgKm)) {
    lines.push(
      `${
        isPL ? "Średni interwał olejowy (km)" : "Avg oil interval (km)"
      }: ${Math.round(oil.avgKm).toLocaleString()} km`
    );
  }
  if (Number.isFinite(oil.avgMonths)) {
    lines.push(
      `${
        isPL ? "Średni interwał olejowy (mies.)" : "Avg oil interval (months)"
      }: ${oil.avgMonths.toFixed(1)}`
    );
  }

  // 3. Łączny koszt serwisu
  if (stats.totalCost > 0) {
    lines.push(
      `${
        isPL ? "Łączny koszt serwisów" : "Total service cost"
      }: ${stats.totalCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`
    );
  }

  // 4. Liczba wpisów serwisowych
  lines.push(
    `${isPL ? "Liczba wpisów serwisowych" : "Number of service entries"}: ${
      stats.entryCount
    }`
  );

  // 5. Koszty według kategorii
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
        `- ${label}: ${cost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${currency}`
      );
    });
  }

  if (lines.length === 0) {
    return isPL ? "Brak danych o serwisach." : "No service data.";
  }
  return lines.join("\n");
}

function getOilChangeData(entries: ServiceEntry[]): OilChangeData {
  const oilEntries = entries
    .filter((e) => (e.category ?? "other") === "oil_engine")
    .sort(
      (a, b) =>
        new Date(a.service_date).getTime() - new Date(b.service_date).getTime()
    );
  const last = oilEntries.length > 0 ? oilEntries[oilEntries.length - 1] : null;
  const lastDate = last?.service_date?.slice(0, 10) ?? null;
  const lastMileage = last?.mileage ?? null;

  let avgKm = NaN;
  let avgMonths = NaN;
  if (oilEntries.length >= 2) {
    const kmDeltas: number[] = [];
    const monthDeltas: number[] = [];
    for (let i = 1; i < oilEntries.length; i++) {
      const prev = oilEntries[i - 1];
      const curr = oilEntries[i];
      if (
        prev.mileage != null &&
        curr.mileage != null &&
        curr.mileage > prev.mileage
      ) {
        kmDeltas.push(curr.mileage - prev.mileage);
      }
      const prevDate = new Date(prev.service_date);
      const currDate = new Date(curr.service_date);
      const months =
        (currDate.getFullYear() - prevDate.getFullYear()) * 12 +
        (currDate.getMonth() - prevDate.getMonth());
      if (months > 0) monthDeltas.push(months);
    }
    avgKm =
      kmDeltas.length > 0
        ? kmDeltas.reduce((a, b) => a + b, 0) / kmDeltas.length
        : NaN;
    avgMonths =
      monthDeltas.length > 0
        ? monthDeltas.reduce((a, b) => a + b, 0) / monthDeltas.length
        : NaN;
  }
  return { lastDate, lastMileage, avgKm, avgMonths };
}

function formatWheelsAndTiresSection(
  tires: VehicleTire[],
  wheels: VehicleWheel[],
  language: "en" | "pl"
): string {
  const isPL = language === "pl";
  const lines: string[] = [];
  if (tires.length > 0) {
    lines.push(isPL ? "Opony:" : "Tires:");
    tires.forEach((t) => {
      const dim = formatTireDimensions(
        t.width_mm,
        t.aspect_ratio,
        t.diameter_inch
      );
      const typeLabel = getTireTypeLabel(t.tire_type, language);
      const current = t.is_currently_fitted
        ? isPL
          ? " (aktualnie na aucie)"
          : " (currently fitted)"
        : "";
      const dot = t.dot ? ` DOT ${t.dot}` : "";
      lines.push(`  ${t.name || dim} – ${dim} ${typeLabel}${dot}${current}`);
    });
  }
  if (wheels.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(isPL ? "Felgi:" : "Rims:");
    wheels.forEach((w) => {
      const dim = formatWheelDimensions(w.width_inch, w.diameter_inch);
      const parts = [dim];
      if (w.et_offset != null) parts.push(`ET${w.et_offset}`);
      if (w.bolt_pattern) parts.push(w.bolt_pattern);
      if (w.center_bore_mm != null) parts.push(`CB ${w.center_bore_mm}mm`);
      if (w.bolt_type) parts.push(w.bolt_type);
      if (w.weight_kg != null) parts.push(`${w.weight_kg} kg`);
      const current = w.is_currently_fitted
        ? isPL
          ? " (aktualnie na aucie)"
          : " (currently fitted)"
        : "";
      lines.push(`  ${w.name || dim} – ${parts.join(" ")}${current}`);
    });
  }
  return lines.join("\n");
}

type MarketplaceOptions = {
  includePrice: boolean;
  price: number | null;
  currency: string;
  includeServiceEntries: boolean;
  includeFuelingStats: boolean;
  includeServiceStats: boolean;
  includeWheelsTires: boolean;
  includeNotes: boolean;
  includeInsurance: boolean;
  includeInspection: boolean;
  publicReportUrl: string | null;
};

function generateMarketplacePostForLang(
  vehicle: VehicleData,
  serviceEntries: ServiceEntry[],
  fuelingEntries: FuelingEntry[],
  tires: VehicleTire[],
  wheels: VehicleWheel[],
  language: "en" | "pl",
  options: MarketplaceOptions
): string {
  const isPL = language === "pl";

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
    options.includePrice && options.price !== null && options.price > 0
      ? `${isPL ? "Cena" : "Price"}: ${options.price.toLocaleString()} ${
          options.currency
        }`
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
  const insuranceLine =
    options.includeInsurance && vehicle.insurance_valid_until
      ? `${isPL ? "Ubezpieczenie ważne do" : "Insurance valid until"}: ${
          vehicle.insurance_valid_until
        }`
      : null;
  const inspectionLine =
    options.includeInspection && vehicle.inspection_valid_until
      ? `${
          isPL
            ? "Przegląd techniczny ważny do"
            : "Technical inspection valid until"
        }: ${vehicle.inspection_valid_until}`
      : null;
  const specExtras = [insuranceLine, inspectionLine].filter(Boolean);
  const specFull =
    specExtras.length > 0 ? spec + "\n" + specExtras.join("\n") : spec;
  sections.push(specFull);

  if (options.includeServiceEntries) {
    const historyTitle = isPL ? "HISTORIA SERWISOWA" : "SERVICE HISTORY";
    const history = `=== ${historyTitle} ===
${formatServiceHistory(serviceEntries, language)}`;
    sections.push(history);
  }

  if (options.includeFuelingStats) {
    const fuelingStats = calculateFuelingStats(fuelingEntries, language);
    const statsTitle = isPL ? "STATYSTYKI TANKOWAŃ" : "FUELING STATISTICS";
    const stats = `=== ${statsTitle} ===
${formatFuelingStats(fuelingStats, options.currency, language)}`;
    sections.push(stats);
  }

  if (options.includeServiceStats) {
    const serviceStats = calculateServiceStats(serviceEntries, language);
    const oilData = getOilChangeData(serviceEntries);
    const statsTitle = isPL ? "STATYSTYKI SERWISOWE" : "SERVICE STATISTICS";
    const stats = `=== ${statsTitle} ===
${formatServiceStats(serviceStats, oilData, options.currency, language)}`;
    sections.push(stats);
  }

  if (options.includeNotes && vehicle.notes) {
    const notesTitle = isPL ? "NOTATKI" : "NOTES";
    const notesSection = `=== ${notesTitle} ===
${vehicle.notes}`;
    sections.push(notesSection);
  }

  if (options.includeWheelsTires && (tires.length > 0 || wheels.length > 0)) {
    const wheelsTitle = isPL ? "FELGI I OPONY" : "WHEELS AND TIRES";
    const wheelsSection = `=== ${wheelsTitle} ===
${formatWheelsAndTiresSection(tires, wheels, language)}`;
    sections.push(wheelsSection);
  }

  if (options.publicReportUrl) {
    const reportTitle = isPL ? "RAPORT ONLINE" : "ONLINE REPORT";
    const reportSection = `=== ${reportTitle} ===
${
  isPL
    ? "Szczegółowy raport dostępny pod adresem:"
    : "Detailed report available at:"
}
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

    const reqBody: GenerateRequest = await req.json();
    const {
      vehicleId,
      price = null,
      currency = "PLN",
      includePrice = false,
      includeServiceEntries = true,
      includeServiceHistory,
      includeFuelingStats = false,
      includeServiceStats = false,
      includeWheelsTires = false,
      includeWheels,
      includeTires,
      includeNotes = false,
      includeInsurance = true,
      includeInspection = true,
      publicReportUrl = null,
    } = reqBody;

    const vIncludeServiceEntries =
      includeServiceHistory ?? includeServiceEntries;
    const vIncludeWheelsTires =
      (includeWheels ?? includeWheelsTires) ||
      (includeTires ?? includeWheelsTires);

    if (!vehicleId) {
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

    // Fetch service entries (if needed)
    let serviceEntries: ServiceEntry[] = [];
    if (vIncludeServiceEntries || includeServiceStats) {
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

    // Fetch vehicle tires and wheels (if wheels/tires section needed)
    let tires: VehicleTire[] = [];
    let wheels: VehicleWheel[] = [];
    if (vIncludeWheelsTires) {
      const { data: tiresData } = await supabaseClient
        .from("vehicle_tires")
        .select(
          "name, width_mm, aspect_ratio, diameter_inch, tire_type, dot, is_currently_fitted"
        )
        .eq("vehicle_id", vehicleId)
        .order("is_currently_fitted", { ascending: false })
        .order("created_at", { ascending: false });
      tires = (tiresData || []) as VehicleTire[];
      const { data: wheelsData } = await supabaseClient
        .from("vehicle_wheels")
        .select(
          "name, width_inch, diameter_inch, et_offset, bolt_pattern, center_bore_mm, bolt_type, weight_kg, is_currently_fitted"
        )
        .eq("vehicle_id", vehicleId)
        .order("is_currently_fitted", { ascending: false })
        .order("created_at", { ascending: false });
      wheels = (wheelsData || []) as VehicleWheel[];
    }

    const options: MarketplaceOptions = {
      includePrice,
      price: price ?? null,
      currency,
      includeServiceEntries: vIncludeServiceEntries,
      includeFuelingStats,
      includeServiceStats,
      includeWheelsTires: vIncludeWheelsTires,
      includeNotes,
      includeInsurance,
      includeInspection,
      publicReportUrl,
    };

    const contentPl = generateMarketplacePostForLang(
      vehicle as VehicleData,
      serviceEntries,
      fuelingEntries,
      tires,
      wheels,
      "pl",
      options
    );
    const contentEn = generateMarketplacePostForLang(
      vehicle as VehicleData,
      serviceEntries,
      fuelingEntries,
      tires,
      wheels,
      "en",
      options
    );

    const content = { pl: contentPl, en: contentEn };

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
