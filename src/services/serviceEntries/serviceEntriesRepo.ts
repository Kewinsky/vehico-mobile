import { supabase } from '../supabase/client';
import type { ServiceEntry } from '../../types/domain';

type NewServiceEntryInput = {
  vehicle_id: string;
  service_date: string;
  mileage: number | null;
  title: string;
  description: string;
  cost: number | null;
};

export async function listServiceEntries(vehicleId: string): Promise<ServiceEntry[]> {
  const { data, error } = await supabase
    .from('service_entries')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ServiceEntry[];
}

export async function createServiceEntry(input: NewServiceEntryInput): Promise<ServiceEntry> {
  const { data, error } = await supabase.from('service_entries').insert(input).select('*').single();
  if (error) throw error;
  return data as ServiceEntry;
}

