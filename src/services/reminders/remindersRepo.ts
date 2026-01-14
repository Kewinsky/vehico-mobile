import type { Reminder, ReminderType } from "../../types/domain";
import { supabase } from "../supabase/client";

type NewReminder = {
  vehicle_id: string;
  type: ReminderType;
  due_date: string | null;
  due_mileage: number | null;
  note: string | null;
  channel_email: boolean;
  channel_push: boolean;
  enabled: boolean;
};

export async function listReminders(vehicleId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
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
  const { data, error } = await supabase
    .from("reminders")
    .insert(input)
    .select("*")
    .single();
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
