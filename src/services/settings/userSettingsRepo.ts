import type { UserSettings } from '../../types/domain';
import { supabase } from '../supabase/client';

export async function getOrCreateUserSettings(): Promise<UserSettings> {
  const { data, error } = await supabase.from('user_settings').select('*').maybeSingle();
  if (error) throw error;
  if (data) return data as UserSettings;

  const { data: created, error: createError } = await supabase
    .from('user_settings')
    .insert({})
    .select('*')
    .single();
  if (createError) throw createError;
  return created as UserSettings;
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .update(patch)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserSettings;
}

