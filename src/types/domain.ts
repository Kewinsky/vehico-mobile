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
  created_at: string;
};

export type ServiceEntry = {
  id: string;
  vehicle_id: string;
  service_date: string; // ISO date
  mileage: number | null;
  title: string;
  description: string;
  cost: number | null;
  created_at: string;
};

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

