import * as Notifications from "expo-notifications";

import { APP_DISPLAY_NAME } from "../../config/appBrand";
import { i18n } from "../../i18n/i18n";
import type { Vehicle } from "../../types/domain";
import { formatLongMonthDisplayDate } from "../../utils/dateFormatting";

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;
const PREFIX = "vehico-formality-";

/** Days before expiry to notify: 7, 3, and on the expiry date (0). */
export const FORMALITY_NOTIFICATION_OFFSETS_DAYS = [7, 3, 0] as const;

export type FormalityKind = "insurance" | "ac" | "inspection";

export type FormalityForSchedule = {
  vehicleId: string;
  vehicleLabel: string;
  kind: FormalityKind;
  validUntil: string | null | undefined;
};

function notificationId(
  vehicleId: string,
  kind: FormalityKind,
  daysBefore: number,
): string {
  return `${PREFIX}${kind}-${vehicleId}-${daysBefore}`;
}

function vehicleDisplayLabel(vehicle: Pick<Vehicle, "make" | "model">): string {
  const label = `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();
  return label || APP_DISPLAY_NAME;
}

async function ensureNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

function resolveTriggerDate(
  validUntilYmd: string,
  daysBefore: number,
): Date | null {
  const due = new Date(`${validUntilYmd.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return null;

  const trigger = new Date(due);
  trigger.setHours(DEFAULT_HOUR, DEFAULT_MINUTE, 0, 0);
  if (daysBefore > 0) {
    trigger.setDate(trigger.getDate() - daysBefore);
  }

  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (trigger.getTime() <= now) {
    if (daysBefore === 0 && trigger.getTime() >= todayStart.getTime()) {
      trigger.setTime(now + 60 * 1000);
      return trigger;
    }
    return null;
  }

  return trigger;
}

function notificationBody(
  kind: FormalityKind,
  daysBefore: number,
  vehicleLabel: string,
  dateFormatted: string,
): string {
  if (daysBefore === 0) {
    const key =
      kind === "insurance"
        ? "dashboard.formalityNotification.insuranceToday"
        : kind === "ac"
          ? "dashboard.formalityNotification.acToday"
          : "dashboard.formalityNotification.inspectionToday";
    return i18n.t(key, { vehicle: vehicleLabel });
  }
  const key =
    kind === "insurance"
      ? "dashboard.formalityNotification.insuranceBefore"
      : kind === "ac"
        ? "dashboard.formalityNotification.acBefore"
        : "dashboard.formalityNotification.inspectionBefore";
  return i18n.t(key, { vehicle: vehicleLabel, days: daysBefore, date: dateFormatted });
}

export async function cancelFormalityNotifications(
  vehicleId: string,
  kind: FormalityKind,
): Promise<void> {
  for (const daysBefore of FORMALITY_NOTIFICATION_OFFSETS_DAYS) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        notificationId(vehicleId, kind, daysBefore),
      );
    } catch {
      // ignore if not found
    }
  }
}

export async function cancelVehicleFormalityNotifications(
  vehicleId: string,
): Promise<void> {
  await Promise.all([
    cancelFormalityNotifications(vehicleId, "insurance"),
    cancelFormalityNotifications(vehicleId, "ac"),
    cancelFormalityNotifications(vehicleId, "inspection"),
  ]);
}

export async function cancelAllFormalityNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function scheduleFormalityNotifications(
  input: FormalityForSchedule,
): Promise<void> {
  const validUntil = input.validUntil?.trim().slice(0, 10) ?? "";
  await cancelFormalityNotifications(input.vehicleId, input.kind);
  if (!validUntil) return;

  if (!(await ensureNotificationPermissions())) return;

  const lang = i18n.language ?? "en";
  const dateFormatted = formatLongMonthDisplayDate(validUntil, lang);
  const data = {
    vehicleId: input.vehicleId,
    formalityKind: input.kind,
  };

  for (const daysBefore of FORMALITY_NOTIFICATION_OFFSETS_DAYS) {
    const triggerDate = resolveTriggerDate(validUntil, daysBefore);
    if (!triggerDate) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(input.vehicleId, input.kind, daysBefore),
      content: {
        title: APP_DISPLAY_NAME,
        body: notificationBody(
          input.kind,
          daysBefore,
          input.vehicleLabel,
          dateFormatted,
        ),
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

export async function rescheduleVehicleFormalityNotifications(
  vehicle: Vehicle,
): Promise<void> {
  const vehicleLabel = vehicleDisplayLabel(vehicle);
  await Promise.all([
    scheduleFormalityNotifications({
      vehicleId: vehicle.id,
      vehicleLabel,
      kind: "insurance",
      validUntil: vehicle.insurance_valid_until,
    }),
    scheduleFormalityNotifications({
      vehicleId: vehicle.id,
      vehicleLabel,
      kind: "ac",
      validUntil: vehicle.ac_valid_until,
    }),
    scheduleFormalityNotifications({
      vehicleId: vehicle.id,
      vehicleLabel,
      kind: "inspection",
      validUntil: vehicle.inspection_valid_until,
    }),
  ]);
}

export async function rescheduleAllVehicleFormalityNotifications(
  vehicles: Vehicle[],
): Promise<void> {
  await Promise.all(
    vehicles.map((vehicle) => rescheduleVehicleFormalityNotifications(vehicle)),
  );
}
