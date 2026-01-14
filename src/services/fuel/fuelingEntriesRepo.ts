import type { FuelingEntry } from '../../types/domain';
import { supabase } from '../supabase/client';

type NewFuelingEntry = Omit<FuelingEntry, 'id' | 'created_at'>;

export async function listFuelingEntries(vehicleId: string): Promise<FuelingEntry[]> {
  const { data, error } = await supabase
    .from('fueling_entries')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FuelingEntry[];
}

export async function getFuelingEntry(id: string): Promise<FuelingEntry> {
  const { data, error } = await supabase
    .from('fueling_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Fueling entry not found');
  return data as FuelingEntry;
}

export async function createFuelingEntry(input: NewFuelingEntry): Promise<FuelingEntry> {
  const { data, error } = await supabase.from('fueling_entries').insert(input).select('*').single();
  if (error) throw error;
  return data as FuelingEntry;
}

export async function updateFuelingEntry(id: string, patch: Partial<NewFuelingEntry>): Promise<FuelingEntry> {
  const { data, error } = await supabase
    .from('fueling_entries')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      'Fueling entry could not be updated. Check RLS UPDATE policy on fueling_entries.'
    );
  return data as FuelingEntry;
}

export async function deleteFuelingEntry(id: string): Promise<void> {
  // Some Supabase projects enforce RLS that blocks UPDATE on fueling_entries.
  // Prefer DELETE, which is commonly allowed via delete policies.
  const { error } = await supabase.from('fueling_entries').delete().eq('id', id);
  if (error) throw error;
}

