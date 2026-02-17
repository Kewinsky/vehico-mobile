export type VehicleType = "car" | "motorcycle";

export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "lpg";
export type TransmissionType = "manual" | "automatic";
export type DriveType = "FWD" | "RWD" | "AWD";

export type Vehicle = {
  id: string;
  owner_id: string;
  type: VehicleType;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
  mileage: number | null; // current mileage in km
  engine_capacity: number | null; // in cm³
  power_hp: number | null; // horsepower
  fuel_type: FuelType | null;
  transmission: TransmissionType | null;
  drive_type: DriveType | null;
  notes: string | null;
  insurance_valid_until?: string | null;
  inspection_valid_until?: string | null;
  created_at: string;
};

export type ServiceEntry = {
  id: string;
  vehicle_id: string;
  service_date: string; // ISO date
  mileage: number | null;
  category: ServiceEntryCategory | null;
  title: string;
  description: string;
  cost: number | null;
  workshop_id: string | null;
  created_at: string;
};

export type TireType =
  | "summer"
  | "winter"
  | "all_season"
  | "run_flat"
  | "uhp"
  | "suv_xl";

export type VehicleTire = {
  id: string;
  vehicle_id: string;
  name: string;
  width_mm: number;
  aspect_ratio: number;
  diameter_inch: number;
  tire_type: TireType;
  dot: string | null;
  is_currently_fitted: boolean;
  created_at: string;
};

export type VehicleWheel = {
  id: string;
  vehicle_id: string;
  name: string;
  width_inch: number;
  diameter_inch: number;
  et_offset: number | null;
  bolt_pattern: string | null;
  center_bore_mm: number | null;
  bolt_type: string | null;
  weight_kg: number | null;
  is_currently_fitted: boolean;
  created_at: string;
};

export type WorkshopType =
  | "mechanic"
  | "electrician"
  | "detailer"
  | "bodywork"
  | "car_wash"
  | "other";

export type Workshop = {
  id: string;
  owner_id: string;
  name: string;
  workshop_type: WorkshopType;
  phone_number: string | null;
  address: string | null;
  created_at: string;
};

export type ServiceEntryCategory =
  | "maintenance"
  | "repair"
  | "inspection"
  | "upgrade"
  | "oil_engine"
  | "other";

export type AttachmentType = "receipt" | "invoice" | "photo";

export type Attachment = {
  id: string;
  service_entry_id: string;
  type: AttachmentType;
  storage_bucket: "images" | "documents";
  storage_path: string;
  created_at: string;
  /** When set, file is stored locally (not in Supabase). */
  local_path?: string;
};

export type PublicReportSnapshot = {
  id: string;
  vehicle_id: string;
  public_id: string; // unguessable, used in URLs
  title: string | null;
  snapshot_data: {
    vehicle: Vehicle;
    service_entries: ServiceEntry[];
    fueling_entries?: FuelingEntry[]; // Optional, included if fueling stats requested
    vehicle_photos: Array<{
      id: string;
      storage_path: string;
      storage_bucket: "images" | "report-photos";
      source: "vehicle" | "report-temp";
      display_order: number;
      created_at: string;
    }>;
    report_options?: {
      include_service_entries: boolean;
      include_notes: boolean;
      include_fueling_stats: boolean;
      include_service_stats: boolean;
      include_wheels_tires?: boolean;
    };
    vehicle_tires?: VehicleTire[];
    vehicle_wheels?: VehicleWheel[];
    snapshot_version: string;
    snapshot_date: string;
  };
  created_at: string;
};

export type Currency = "PLN" | "EUR";
export type DistanceUnit = "km" | "miles";
export type FuelUnit = "liters" | "gallons";
export type ThemePreference = "system" | "light" | "dark";
export type Language = "en" | "pl";

export type UserSettings = {
  user_id: string;
  currency: Currency;
  distance_unit: DistanceUnit;
  fuel_unit: FuelUnit;
  theme: ThemePreference;
  language: Language;
  created_at: string;
  updated_at: string;
};

export type VehiclePhoto = {
  id: string;
  vehicle_id: string;
  storage_bucket: "images";
  storage_path: string;
  display_order: number;
  created_at: string;
};

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  storage_bucket: "images" | "documents";
  storage_path: string;
  description: string | null;
  created_at: string;
  /** When set, file is stored locally (not in Supabase). */
  local_path?: string;
};

export type GasStation =
  | "orlen"
  | "bp"
  | "shell"
  | "circle_k"
  | "mol"
  | "moya"
  | "other";

export type FuelGrade = "95" | "98" | "100" | "on" | "lpg";

export type FuelingEntry = {
  id: string;
  vehicle_id: string;
  date: string; // YYYY-MM-DD
  distance: number;
  fuel_amount: number;
  fuel_cost: number;
  fuel_type: FuelGrade | null;
  gas_station: GasStation | null;
  created_at: string;
};

export type ExpenseCategory = "service" | "parts" | "insurance" | "other";

export type ReminderStatus = "active" | "done";

export type ReminderRecurrenceUnit = "days" | "weeks" | "months" | "years";

export type Reminder = {
  id: string;
  vehicle_id: string;
  due_date: string | null;
  due_mileage: number | null;
  days_before: number | null;
  title: string | null;
  notes: string | null;
  status: ReminderStatus;
  channel_email: boolean;
  channel_push: boolean;
  enabled: boolean;
  delivered_at: string | null;
  created_at: string;
  recurrence_interval_value: number | null;
  recurrence_interval_unit: ReminderRecurrenceUnit | null;
  recurrence_interval_km: number | null;
  recurrence_anchor_mileage: number | null;
};

export type MarketplacePlatform = "olx" | "facebook" | "generic";

export type MarketplacePostContent = {
  pl: string;
  en: string;
};

export type MarketplacePost = {
  id: string;
  vehicle_id: string;
  user_id: string;
  platform: MarketplacePlatform;
  price: number | null;
  content: MarketplacePostContent;
  title: string | null;
  created_at: string;
  updated_at: string;
};
