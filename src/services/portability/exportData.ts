import type {
  FuelingEntry,
  Reminder,
  ServiceEntry,
  Vehicle,
  VehicleTire,
  VehicleWheel,
  Workshop,
} from "../../types/domain";
import { listFuelingEntries } from "../fuel/fuelingEntriesRepo";
import { listReminders } from "../reminders/remindersRepo";
import type { ListRemindersOptions } from "../reminders/remindersRepo";
import { listServiceEntries } from "../serviceEntries/serviceEntriesRepo";
import { listVehicleTires } from "../tires/tiresRepo";
import type { ListVehicleTiresOptions } from "../tires/tiresRepo";
import { getVehicle } from "../vehicles/vehiclesRepo";
import { listVehicleWheels } from "../wheels/wheelsRepo";
import type { ListVehicleWheelsOptions } from "../wheels/wheelsRepo";
import { listWorkshops } from "../workshops/workshopsRepo";
import type { ListWorkshopsOptions } from "../workshops/workshopsRepo";
import { formatYmd } from "../../utils/dateYmd";

export type ExportFormat = "json" | "csv";

export type ExportDataType =
  | "service_entries"
  | "fueling_entries"
  | "reminders"
  | "wheels"
  | "tires"
  | "workshops";

export type ExportTimeRange =
  | "current_month"
  | "previous_month"
  | "last_90_days"
  | "current_year"
  | "custom";

export type ExportDateBounds = {
  fromYmd: string;
  toYmd: string;
};

export type ExportEntitlementOptions = {
  reminderOpts?: ListRemindersOptions;
  tireOpts?: ListVehicleTiresOptions;
  wheelOpts?: ListVehicleWheelsOptions;
  workshopOpts?: ListWorkshopsOptions;
};

export type ExportSelection = {
  vehicleId: string;
  format: ExportFormat;
  dataTypes: ExportDataType[];
  dateBounds: ExportDateBounds;
  entitlements: ExportEntitlementOptions;
};

const CSV_DELIMITER = ";";

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (
    raw.includes('"') ||
    raw.includes(";") ||
    raw.includes("\n") ||
    raw.includes("\r")
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function resolveExportDateBounds(
  range: ExportTimeRange,
  customFromYmd: string,
  customToYmd: string,
): ExportDateBounds {
  const today = new Date();
  const todayYmd = formatYmd(today);

  switch (range) {
    case "current_month":
      return { fromYmd: formatYmd(startOfMonth(today)), toYmd: todayYmd };
    case "previous_month": {
      const previousMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      return {
        fromYmd: formatYmd(startOfMonth(previousMonth)),
        toYmd: formatYmd(endOfMonth(previousMonth)),
      };
    }
    case "last_90_days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 89);
      return { fromYmd: formatYmd(from), toYmd: todayYmd };
    }
    case "current_year":
      return { fromYmd: `${today.getFullYear()}-01-01`, toYmd: todayYmd };
    case "custom":
      return {
        fromYmd: customFromYmd.length === 10 ? customFromYmd : todayYmd,
        toYmd: customToYmd.length === 10 ? customToYmd : todayYmd,
      };
  }
}

function dateYmdInBounds(
  value: string | null | undefined,
  bounds: ExportDateBounds,
): boolean {
  if (!value) return false;
  const ymd = String(value).slice(0, 10);
  return ymd >= bounds.fromYmd && ymd <= bounds.toYmd;
}


function serviceEntriesToCsv(rows: ServiceEntry[]): string {
  const header = [
    "service_date",
    "category",
    "title",
    "description",
    "mileage",
    "cost",
  ];
  const lines = rows.map((entry) => [
    csvEscape(String(entry.service_date).slice(0, 10)),
    csvEscape(entry.category ?? "other"),
    csvEscape(entry.title ?? ""),
    csvEscape(entry.description ?? ""),
    csvEscape(entry.mileage ?? ""),
    csvEscape(entry.cost ?? ""),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

function fuelingEntriesToCsv(rows: FuelingEntry[]): string {
  const header = [
    "date",
    "distance",
    "fuel_amount",
    "fuel_cost",
    "fuel_type",
    "gas_station",
  ];
  const lines = rows.map((entry) => [
    csvEscape(String(entry.date).slice(0, 10)),
    csvEscape(entry.distance ?? ""),
    csvEscape(entry.fuel_amount ?? ""),
    csvEscape(entry.fuel_cost ?? ""),
    csvEscape(entry.fuel_type ?? ""),
    csvEscape(entry.gas_station ?? ""),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

function remindersToCsv(rows: Reminder[]): string {
  const header = [
    "due_date",
    "due_mileage",
    "title",
    "notes",
    "status",
    "recurrence_interval_value",
    "recurrence_interval_unit",
    "recurrence_interval_km",
    "recurrence_anchor_mileage",
  ];
  const lines = rows.map((entry) => [
    csvEscape(entry.due_date ?? ""),
    csvEscape(entry.due_mileage ?? ""),
    csvEscape(entry.title ?? ""),
    csvEscape(entry.notes ?? ""),
    csvEscape(entry.status ?? ""),
    csvEscape(entry.recurrence_interval_value ?? ""),
    csvEscape(entry.recurrence_interval_unit ?? ""),
    csvEscape(entry.recurrence_interval_km ?? ""),
    csvEscape(entry.recurrence_anchor_mileage ?? ""),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

function wheelsToCsv(rows: VehicleWheel[]): string {
  const header = [
    "name",
    "width_inch",
    "diameter_inch",
    "et_offset",
    "bolt_pattern",
    "center_bore_mm",
    "bolt_type",
    "weight_kg",
    "is_currently_fitted",
  ];
  const lines = rows.map((entry) => [
    csvEscape(entry.name ?? ""),
    csvEscape(entry.width_inch ?? ""),
    csvEscape(entry.diameter_inch ?? ""),
    csvEscape(entry.et_offset ?? ""),
    csvEscape(entry.bolt_pattern ?? ""),
    csvEscape(entry.center_bore_mm ?? ""),
    csvEscape(entry.bolt_type ?? ""),
    csvEscape(entry.weight_kg ?? ""),
    csvEscape(entry.is_currently_fitted ?? false),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

function tiresToCsv(rows: VehicleTire[]): string {
  const header = [
    "name",
    "width_mm",
    "aspect_ratio",
    "diameter_inch",
    "tire_type",
    "dot",
    "is_currently_fitted",
  ];
  const lines = rows.map((entry) => [
    csvEscape(entry.name ?? ""),
    csvEscape(entry.width_mm ?? ""),
    csvEscape(entry.aspect_ratio ?? ""),
    csvEscape(entry.diameter_inch ?? ""),
    csvEscape(entry.tire_type ?? ""),
    csvEscape(entry.dot ?? ""),
    csvEscape(entry.is_currently_fitted ?? false),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

function workshopsToCsv(rows: Workshop[]): string {
  const header = ["name", "workshop_type", "phone_number", "address"];
  const lines = rows.map((entry) => [
    csvEscape(entry.name ?? ""),
    csvEscape(entry.workshop_type ?? ""),
    csvEscape(entry.phone_number ?? ""),
    csvEscape(entry.address ?? ""),
  ]);
  return [
    header.join(CSV_DELIMITER),
    ...lines.map((row) => row.join(CSV_DELIMITER)),
  ].join("\n");
}

type FetchedExportData = {
  vehicle: Vehicle | null;
  service_entries: ServiceEntry[];
  fueling_entries: FuelingEntry[];
  reminders: Reminder[];
  vehicle_wheels: VehicleWheel[];
  vehicle_tires: VehicleTire[];
  workshops: Workshop[];
};

async function fetchExportData(
  selection: ExportSelection,
): Promise<FetchedExportData> {
  const { vehicleId, dataTypes, dateBounds, entitlements } = selection;
  const needsVehicle = dataTypes.some((type) => type !== "workshops");

  const [
    vehicle,
    service_entries,
    fueling_entries,
    reminders,
    vehicle_wheels,
    vehicle_tires,
    workshops,
  ] = await Promise.all([
    needsVehicle ? getVehicle(vehicleId) : Promise.resolve(null),
    dataTypes.includes("service_entries")
      ? listServiceEntries(vehicleId)
      : Promise.resolve([]),
    dataTypes.includes("fueling_entries")
      ? listFuelingEntries(vehicleId)
      : Promise.resolve([]),
    dataTypes.includes("reminders")
      ? listReminders(vehicleId, entitlements.reminderOpts)
      : Promise.resolve([]),
    dataTypes.includes("wheels")
      ? listVehicleWheels(vehicleId, entitlements.wheelOpts)
      : Promise.resolve([]),
    dataTypes.includes("tires")
      ? listVehicleTires(vehicleId, entitlements.tireOpts)
      : Promise.resolve([]),
    dataTypes.includes("workshops")
      ? listWorkshops(entitlements.workshopOpts)
      : Promise.resolve([]),
  ]);

  return {
    vehicle,
    service_entries: service_entries.filter((entry) =>
      dateYmdInBounds(entry.service_date, dateBounds),
    ),
    fueling_entries: fueling_entries.filter((entry) =>
      dateYmdInBounds(entry.date, dateBounds),
    ),
    reminders: reminders.filter(
      (entry) =>
        dateYmdInBounds(entry.due_date, dateBounds) ||
        dateYmdInBounds(entry.created_at, dateBounds),
    ),
    vehicle_wheels,
    vehicle_tires,
    workshops,
  };
}

function buildJsonExport(
  data: FetchedExportData,
  selection: ExportSelection,
): string {
  const payload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    date_range: selection.dateBounds,
  };

  if (data.vehicle) payload.vehicle = data.vehicle;
  if (selection.dataTypes.includes("service_entries")) {
    payload.service_entries = data.service_entries;
  }
  if (selection.dataTypes.includes("fueling_entries")) {
    payload.fueling_entries = data.fueling_entries;
  }
  if (selection.dataTypes.includes("reminders")) {
    payload.reminders = data.reminders;
  }
  if (selection.dataTypes.includes("wheels")) {
    payload.vehicle_wheels = data.vehicle_wheels;
  }
  if (selection.dataTypes.includes("tires")) {
    payload.vehicle_tires = data.vehicle_tires;
  }
  if (selection.dataTypes.includes("workshops")) {
    payload.workshops = data.workshops;
  }

  return JSON.stringify(payload, null, 2);
}

function buildCsvExport(
  data: FetchedExportData,
  selection: ExportSelection,
  sectionLabel: (type: ExportDataType) => string,
): string {
  const sections: string[] = [];

  const appendSection = (type: ExportDataType, csv: string) => {
    if (!selection.dataTypes.includes(type)) return;
    sections.push(`--- ${sectionLabel(type)} ---\n${csv}`);
  };

  appendSection("service_entries", serviceEntriesToCsv(data.service_entries));
  appendSection("fueling_entries", fuelingEntriesToCsv(data.fueling_entries));
  appendSection("reminders", remindersToCsv(data.reminders));
  appendSection("wheels", wheelsToCsv(data.vehicle_wheels));
  appendSection("tires", tiresToCsv(data.vehicle_tires));
  appendSection("workshops", workshopsToCsv(data.workshops));

  return sections.join("\n\n");
}

export function countFilteredRows(
  data: FetchedExportData,
  dataTypes: ExportDataType[],
): number {
  let count = 0;
  if (dataTypes.includes("service_entries")) count += data.service_entries.length;
  if (dataTypes.includes("fueling_entries")) count += data.fueling_entries.length;
  if (dataTypes.includes("reminders")) count += data.reminders.length;
  if (dataTypes.includes("wheels")) count += data.vehicle_wheels.length;
  if (dataTypes.includes("tires")) count += data.vehicle_tires.length;
  if (dataTypes.includes("workshops")) count += data.workshops.length;
  return count;
}

export async function buildExportPayload(
  selection: ExportSelection,
  sectionLabel: (type: ExportDataType) => string,
): Promise<{ content: string; rowCount: number }> {
  const data = await fetchExportData(selection);
  const rowCount = countFilteredRows(data, selection.dataTypes);
  const content =
    selection.format === "json"
      ? buildJsonExport(data, selection)
      : buildCsvExport(data, selection, sectionLabel);
  return { content, rowCount };
}
