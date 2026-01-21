import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Reminder } from "../../types/domain";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    } as Notifications.NotificationBehavior;
  },
});

/**
 * Requests notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  // Configure notification channel for Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFB803",
    });
  }

  return true;
}

/**
 * Schedules a local notification for a reminder
 */
export async function scheduleReminderNotification(
  reminder: Reminder,
  vehicleTitle: string
): Promise<string | null> {
  if (!reminder.enabled || reminder.status !== "active") {
    return null;
  }

  if (!reminder.channel_push) {
    return null;
  }

  // Cancel any existing notification for this reminder
  await cancelReminderNotification(reminder.id);

  let trigger: Notifications.NotificationTriggerInput | null = null;

  if (reminder.type === "time" && reminder.due_date) {
    const dueDate = new Date(reminder.due_date);
    const daysBefore = reminder.days_before ?? 0;
    
    // Calculate notification date (due_date - days_before)
    const notificationDate = new Date(dueDate);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);
    notificationDate.setHours(9, 0, 0, 0); // 9 AM

    // Only schedule if notification date is in the future
    if (notificationDate > new Date()) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      };
    } else {
      // If notification date has passed, schedule for tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      };
    }
  } else if (reminder.type === "mileage" && reminder.due_mileage) {
    // For mileage-based reminders, we can't schedule in advance
    // They need to be checked when mileage is updated (service entries, etc.)
    // We don't schedule notifications for mileage-based reminders
    return null;
  }

  if (!trigger) {
    return null;
  }

  const title = reminder.title || "Reminder";
  const body = reminder.notes
    ? `${vehicleTitle}: ${reminder.notes}`
    : vehicleTitle;

  const notificationId = await Notifications.scheduleNotificationAsync({
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
    trigger,
  });

  return notificationId;
}

/**
 * Cancels a scheduled notification for a reminder
 */
export async function cancelReminderNotification(
  reminderId: string
): Promise<void> {
  // Get all scheduled notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  // Find and cancel notifications for this reminder
  for (const notification of scheduled) {
    if (notification.content.data?.reminderId === reminderId) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }
  }
}

/**
 * Cancels all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Gets notification response handler
 * Returns a subscription that can be used to handle notification taps
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Gets notification response handler (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Gets the last notification response (if app was opened from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}
