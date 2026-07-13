import { Alert } from "react-native";
import type { TFunction } from "i18next";

import type { Reminder } from "../../types/domain";
import { createServiceEntry } from "../serviceEntries/serviceEntriesRepo";

export function serviceEntryInputFromReminder(reminder: Reminder) {
  const today = new Date().toISOString().slice(0, 10);
  const serviceDate = reminder.due_date
    ? String(reminder.due_date).slice(0, 10)
    : today;

  return {
    vehicle_id: reminder.vehicle_id,
    service_date: serviceDate,
    mileage: reminder.due_mileage ?? null,
    category: "other" as const,
    title: reminder.title?.trim() || "",
    description: "",
    cost: null,
  };
}

export async function createServiceEntryFromReminder(
  reminder: Reminder,
): Promise<void> {
  await createServiceEntry(serviceEntryInputFromReminder(reminder));
}

export function promptAddServiceEntryFromReminder(
  reminder: Reminder,
  t: TFunction,
  handlers?: {
    onCreated?: () => void;
    onError?: (error: unknown) => void;
    onDismiss?: () => void;
  },
): void {
  const displayTitle = reminder.title?.trim() || t("reminderDetail.title");

  Alert.alert(
    t("reminders.addServiceFromReminderTitle"),
    t("reminders.addServiceFromReminderBody", { title: displayTitle }),
    [
      {
        text: t("common.no"),
        style: "cancel",
        onPress: () => handlers?.onDismiss?.(),
      },
      {
        text: t("common.yes"),
        onPress: async () => {
          try {
            await createServiceEntryFromReminder(reminder);
            handlers?.onCreated?.();
          } catch (e: unknown) {
            handlers?.onError?.(e);
          } finally {
            handlers?.onDismiss?.();
          }
        },
      },
    ],
  );
}
