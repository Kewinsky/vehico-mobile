import * as Notifications from "expo-notifications";

import { APP_DISPLAY_NAME } from "../../config/appBrand";
import { i18n } from "../../i18n/i18n";
import { formatLongMonthDisplayDate } from "../../utils/dateFormatting";

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

/** Prefix for scheduled notification identifiers so we can cancel by reminder id */
const PREFIX = "vehico-reminder-";
const PREFIX_BEFORE = "vehico-reminder-before-";

/** Relative lead time for push body, with correct EN/PL singular/plural. */
function formatReminderLeadTimePhrase(days: number, lang: string): string {
  const pl = lang.toLowerCase().startsWith("pl");
  if (pl) {
    return days === 1 ? `za ${days} dzień` : `za ${days} dni`;
  }
  return days === 1 ? `in ${days} day` : `in ${days} days`;
}

export type ReminderForSchedule = {
  id: string;
  vehicle_id: string;
  due_date: string | null;
  days_before: number | null;
  title: string | null;
  status: string;
  channel_push: boolean;
  enabled: boolean;
};

/**
 * Schedule local notifications when reminder has a due_date.
 * - On due_date at 9:00 (or due_date - days_before if set).
 * Does nothing if no due_date or push disabled / reminder not active.
 */
export async function scheduleLocalReminder(
  reminder: ReminderForSchedule
): Promise<void> {
  if (!reminder.due_date) return;
  if (
    reminder.status !== "active" ||
    !reminder.channel_push ||
    !reminder.enabled
  )
    return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    if (requested !== "granted") return;
  }

  await cancelLocalReminder(reminder.id);

  const title = APP_DISPLAY_NAME;
  const lang = i18n.language ?? "en";
  const reminderTitle =
    (reminder.title ?? "").trim() ||
    i18n.t("reminders.localNotification.defaultTitle");
  const dateFormatted = formatLongMonthDisplayDate(reminder.due_date, lang);
  const body = i18n.t("reminders.localNotification.onDueDay", {
    title: reminderTitle,
    date: dateFormatted,
  });
  const data = { reminderId: reminder.id, vehicleId: reminder.vehicle_id };

  const due = new Date(reminder.due_date);
  due.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (due.getTime() <= now) {
    if (due.getTime() >= todayStart.getTime()) {
      // Due date is today but 9:00 already passed — schedule in 1 min so user still gets notified
      due.setTime(now + 60 * 1000);
    } else {
      // Due date is in the past (before today) — don't schedule
      return;
    }
  }

  const ids: string[] = [];

  // "X days before" notification
  const daysBefore = reminder.days_before ?? 0;
  if (daysBefore > 0) {
    const beforeDate = new Date(due);
    beforeDate.setDate(beforeDate.getDate() - daysBefore);
    if (beforeDate.getTime() > Date.now()) {
      const beforeBody = i18n.t("reminders.localNotification.daysBefore", {
        title: reminderTitle,
        when: formatReminderLeadTimePhrase(daysBefore, lang),
        date: dateFormatted,
      });
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX_BEFORE}${reminder.id}`,
        content: {
          title,
          body: beforeBody,
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: beforeDate,
        },
      });
      if (id) ids.push(id);
    }
  }

  // On due date
  const id = await Notifications.scheduleNotificationAsync({
    identifier: `${PREFIX}${reminder.id}`,
    content: { title, body, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: due,
    },
  });
  if (id) ids.push(id);
}

/**
 * Cancel all local notifications for this reminder (on due date and "days before").
 */
export async function cancelLocalReminder(reminderId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${PREFIX}${reminderId}`
    );
    await Notifications.cancelScheduledNotificationAsync(
      `${PREFIX_BEFORE}${reminderId}`
    );
  } catch {
    // ignore if not found
  }
}
