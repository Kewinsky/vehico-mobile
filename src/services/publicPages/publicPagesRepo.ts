import type { PublicPage } from '../../types/domain';
import { supabase } from '../supabase/client';

export async function getOrCreatePublicPage(vehicleId: string): Promise<PublicPage> {
  const { data: existing, error: existingError } = await supabase
    .from('public_pages')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing[0]) return existing[0] as PublicPage;

  const { data, error } = await supabase
    .from('public_pages')
    .insert({ vehicle_id: vehicleId })
    .select('*')
    .single();

  if (error) throw error;
  return data as PublicPage;
}

