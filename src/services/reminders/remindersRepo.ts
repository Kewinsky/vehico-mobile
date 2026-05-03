import type { Reminder, ReminderRecurrenceUnit } from "../../types/domain";
import { supabase } from "../supabase/client";
import { sortRemindersActiveFirstByCreatedAt } from "./reminderOrdering";

export { sortRemindersActiveFirstByCreatedAt } from "./reminderOrdering";

/** Add interval to a YYYY-MM-DD date string; returns YYYY-MM-DD */
function addIntervalToDate(
  ymd: string,
  value: number,
  unit: ReminderRecurrenceUnit,
): string {
  const d = new Date(ymd + "T12:00:00");
  if (unit === "days") d.setDate(d.getDate() + value);
  else if (unit === "weeks") d.setDate(d.getDate() + value * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + value);
  else if (unit === "years") d.setFullYear(d.getFullYear() + value);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns patch to apply when user marks a recurring reminder as "done":
 * advance due_date and/or due_mileage/anchor by one interval and keep status active.
 * Returns null if reminder is not recurring (then caller should set status to "done").
 */
export function getRecurrenceAdvancePatch(
  reminder: Reminder,
): Partial<NewReminder> | null {
  const hasTimeRecurrence =
    reminder.recurrence_interval_value != null &&
    reminder.recurrence_interval_unit != null;
  const hasMileageRecurrence = reminder.recurrence_interval_km != null;
  if (!hasTimeRecurrence && !hasMileageRecurrence) return null;

  const patch: Partial<NewReminder> = { status: "active" };
  if (
    hasTimeRecurrence &&
    reminder.due_date &&
    reminder.recurrence_interval_unit
  ) {
    patch.due_date = addIntervalToDate(
      reminder.due_date,
      reminder.recurrence_interval_value!,
      reminder.recurrence_interval_unit,
    );
  }
  if (
    hasMileageRecurrence &&
    reminder.due_mileage != null
  ) {
    patch.recurrence_anchor_mileage = reminder.due_mileage;
    patch.due_mileage =
      reminder.due_mileage + reminder.recurrence_interval_km!;
  }
  return patch;
}

export type NewReminder = {
  vehicle_id: string;
  due_date: string | null;
  due_mileage: number | null;
  days_before: number | null;
  title: string | null;
  notes: string | null;
  status?: "active" | "done";
  channel_email: boolean;
  channel_push: boolean;
  enabled: boolean;
  recurrence_interval_value?: number | null;
  recurrence_interval_unit?: ReminderRecurrenceUnit | null;
  recurrence_interval_km?: number | null;
  recurrence_anchor_mileage?: number | null;
};

export type ListRemindersOptions = {
  /** When set (e.g. free plan without ID list): first N rows after {@link sortRemindersActiveFirstByCreatedAt}. Ignored if freePlanReminderIds is set. */
  limit?: number;
  /** Free plan: return only reminders whose id is in this list (stable set). */
  freePlanReminderIds?: string[] | null;
};

export async function listReminders(
  vehicleId: string,
  options?: ListRemindersOptions,
): Promise<Reminder[]> {
  const ids = options?.freePlanReminderIds;
  if (ids != null) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .in("id", ids);
    if (error) throw error;
    return sortRemindersActiveFirstByCreatedAt((data ?? []) as Reminder[]);
  }
  if (options?.limit != null) {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("vehicle_id", vehicleId);
    if (error) throw error;
    return sortRemindersActiveFirstByCreatedAt((data ?? []) as Reminder[]).slice(
      0,
      options.limit,
    );
  }
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("vehicle_id", vehicleId);
  if (error) throw error;
  return sortRemindersActiveFirstByCreatedAt((data ?? []) as Reminder[]);
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
    p_due_date: input.due_date,
    p_due_mileage: input.due_mileage,
    p_days_before: input.days_before,
    p_title: input.title,
    p_notes: input.notes,
    p_status: input.status ?? "active",
    p_channel_email: input.channel_email,
    p_channel_push: input.channel_push,
    p_enabled: input.enabled,
    p_recurrence_interval_value: input.recurrence_interval_value ?? null,
    p_recurrence_interval_unit: input.recurrence_interval_unit ?? null,
    p_recurrence_interval_km: input.recurrence_interval_km ?? null,
    p_recurrence_anchor_mileage: input.recurrence_anchor_mileage ?? null,
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
