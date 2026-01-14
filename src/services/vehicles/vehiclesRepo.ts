import { supabase } from '../supabase/client';
import type { Vehicle, VehicleType } from '../../types/domain';

type NewVehicleInput = {
  type: VehicleType;
  title: string;
  vin: string | null;
  make: string;
  model: string;
  production_year: number;
};

export async function listVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function createVehicle(input: NewVehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').insert(input).select('*').single();
  if (error) throw error;
  return data as Vehicle;
}

