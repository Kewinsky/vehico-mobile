import type { Reminder, ReminderType } from "../../types/domain";
import { supabase } from "../supabase/client";

type NewReminder = {
  vehicle_id: string;
  type: ReminderType;
  due_date: string | null;
  due_mileage: number | null;
  days_before: number | null; // Only for type 'time'
  title: string | null;
  notes: string | null;
  status?: 'active' | 'done';
  channel_email: boolean;
  channel_push: boolean;
  enabled: boolean;
};

export type ListRemindersOptions = {
  /** When set (e.g. free plan), return only first N by created_at (newest first). */
  limit?: number;
};

export async function listReminders(
  vehicleId: string,
  options?: ListRemindersOptions,
): Promise<Reminder[]> {
  let query = supabase
    .from("reminders")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (options?.limit != null) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

export async function getReminder(id: string): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function createReminder(input: NewReminder): Promise<Reminder> {
  const { data, error } = await supabase.rpc("create_reminder", {
    p_vehicle_id: input.vehicle_id,
    p_type: input.type,
    p_due_date: input.due_date,
    p_due_mileage: input.due_mileage,
    p_days_before: input.days_before,
    p_title: input.title,
    p_notes: input.notes,
    p_status: input.status ?? "active",
    p_channel_email: input.channel_email,
    p_channel_push: input.channel_push,
    p_enabled: input.enabled,
  });
  if (error) throw error;
  return data as Reminder;
}

export async function updateReminder(
  id: string,
  patch: Partial<NewReminder>
): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) throw error;
}
