import type { Reminder } from "../../types/domain";
import { listReminders } from "./remindersRepo";
import { getVehicle } from "../vehicles/vehiclesRepo";
import * as Notifications from "expo-notifications";
import { requestNotificationPermissions } from "../notifications/notificationsService";

/**
 * Checks mileage-based reminders and sends notifications if due
 * Should be called when mileage is updated (e.g., after creating/updating service entry)
 */
export async function checkMileageReminders(
  vehicleId: string,
  currentMileage: number
): Promise<void> {
  try {
    const reminders = await listReminders(vehicleId);
    const activeMileageReminders = reminders.filter(
      (r) =>
        r.type === "mileage" &&
        r.enabled &&
        r.status === "active" &&
        r.channel_push &&
        r.due_mileage != null &&
        currentMileage >= r.due_mileage
    );

    if (activeMileageReminders.length === 0) {
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    const vehicle = await getVehicle(vehicleId);

    // Send immediate notifications for due mileage reminders
    for (const reminder of activeMileageReminders) {
      const title = reminder.title || "Reminder";
      const body = reminder.notes
        ? `${vehicle.title}: ${reminder.notes}`
        : vehicle.title;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            reminderId: reminder.id,
            vehicleId: reminder.vehicle_id,
            type: reminder.type,
          },
          sound: true,
        },
        trigger: null, // Immediate notification
      });
    }
  } catch (error) {
    // Silently fail - notifications are not critical
    console.warn("Failed to check mileage reminders:", error);
  }
}
