export type VehicleType = 'car' | 'motorcycle';

export type Vehicle = {
  id: string;
  owner_id: string;
  type: VehicleType;
  title: string;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
  profile_photo_url: string | null; // URL to profile photo in storage
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
  created_at: string;
};

export type ServiceEntryCategory =
  | 'maintenance'
  | 'repair'
  | 'inspection'
  | 'upgrade'
  | 'other';

export type AttachmentType = 'receipt' | 'invoice' | 'photo';

export type Attachment = {
  id: string;
  service_entry_id: string;
  type: AttachmentType;
  storage_bucket: 'images' | 'documents';
  storage_path: string;
  created_at: string;
};

export type PublicPage = {
  id: string;
  vehicle_id: string;
  public_id: string; // unguessable
  created_at: string;
};


export type Currency = 'PLN' | 'EUR';
export type DistanceUnit = 'km' | 'miles';
export type FuelUnit = 'liters' | 'gallons';
export type ThemePreference = 'system' | 'light' | 'dark';
export type Language = 'en' | 'pl';

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
  storage_bucket: 'images';
  storage_path: string;
  created_at: string;
};

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  storage_bucket: 'images' | 'documents';
  storage_path: string;
  created_at: string;
};


export type FuelingEntry = {
  id: string;
  vehicle_id: string;
  date: string; // YYYY-MM-DD
  distance: number;
  fuel_amount: number;
  fuel_cost: number;
  created_at: string;
};


export type ExpenseCategory = 'service' | 'parts' | 'insurance' | 'other';

export type ReminderType = 'time' | 'mileage';

export type ReminderStatus = 'active' | 'done';

export type Reminder = {
  id: string;
  vehicle_id: string;
  type: ReminderType;
  due_date: string | null;
  due_mileage: number | null;
  days_before: number | null; // Only for type 'time', number of days before due_date to send reminder
  title: string | null;
  notes: string | null;
  status: ReminderStatus;
  channel_email: boolean;
  channel_push: boolean;
  enabled: boolean;
  delivered_at: string | null;
  created_at: string;
};
