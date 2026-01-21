import type { Reminder } from "../../types/domain";
import { listReminders } from "./remindersRepo";
import { listVehicles } from "../vehicles/vehiclesRepo";
import {
  scheduleReminderNotification,
  requestNotificationPermissions,
} from "../notifications/notificationsService";

/**
 * Schedules notifications for all active reminders of a vehicle
 */
export async function scheduleRemindersForVehicle(
  vehicleId: string,
  vehicleTitle: string
): Promise<void> {
  const reminders = await listReminders(vehicleId);
  const activeReminders = reminders.filter(
    (r) => r.enabled && r.status === "active" && r.channel_push
  );

  for (const reminder of activeReminders) {
    await scheduleReminderNotification(reminder, vehicleTitle);
  }
}

/**
 * Schedules notifications for all active reminders across all user vehicles
 */
export async function scheduleAllReminders(): Promise<void> {
  // Request permissions first
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  try {
    const vehicles = await listVehicles();
    
    for (const vehicle of vehicles) {
      await scheduleRemindersForVehicle(vehicle.id, vehicle.title);
    }
  } catch (error) {
    // Silently fail - notifications are not critical
    console.warn("Failed to schedule reminders:", error);
  }
}
