import * as Notifications from "expo-notifications";

import { APP_DISPLAY_NAME } from "../../config/appBrand";
import { i18n } from "../../i18n/i18n";
import { formatLongMonthDisplayDate } from "../../utils/dateFormatting";
import type { PremiumEndingKind } from "../payments/subscriptionStatus";

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;
const PREFIX = "vehico-premium-expiry-";

/** Days before expiry to notify: 3, 1, and on the expiry date (0). */
export const PREMIUM_EXPIRY_NOTIFICATION_OFFSETS_DAYS = [3, 1, 0] as const;

export type PremiumExpiryNotificationInput = {
  kind: PremiumEndingKind;
  expiresAtIso: string;
  willRenew: boolean | null;
};

function notificationId(kind: PremiumEndingKind, daysBefore: number): string {
  return `${PREFIX}${kind}-${daysBefore}`;
}

async function ensureNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === "granted";
}

function resolveTriggerDate(
  expiresAtIso: string,
  daysBefore: number,
): Date | null {
  const due = new Date(expiresAtIso);
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
  kind: PremiumEndingKind,
  daysBefore: number,
  dateFormatted: string,
  willRenew: boolean | null,
): string {
  if (kind === "trial") {
    if (daysBefore === 0) {
      return willRenew === true
        ? i18n.t("premiumExpiry.notification.trialConvertsToday")
        : i18n.t("premiumExpiry.notification.trialEndsToday");
    }
    return willRenew === true
      ? i18n.t("premiumExpiry.notification.trialConvertsBefore", {
          days: daysBefore,
          date: dateFormatted,
        })
      : i18n.t("premiumExpiry.notification.trialEndsBefore", {
          days: daysBefore,
          date: dateFormatted,
        });
  }

  if (daysBefore === 0) {
    return i18n.t("premiumExpiry.notification.subscriptionEndsToday");
  }
  return i18n.t("premiumExpiry.notification.subscriptionEndsBefore", {
    days: daysBefore,
    date: dateFormatted,
  });
}

export async function cancelAllPremiumExpiryNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Schedule local pushes before Premium trial / cancelled-subscription expiry.
 * Idempotent: cancels previous premium-expiry notifications first.
 */
export async function reschedulePremiumExpiryNotifications(
  input: PremiumExpiryNotificationInput | null,
): Promise<void> {
  await cancelAllPremiumExpiryNotifications();
  if (!input?.expiresAtIso) return;

  // Auto-renewing paid periods don't need "ending" pushes.
  if (input.kind === "subscription" && input.willRenew !== false) return;

  if (!(await ensureNotificationPermissions())) return;

  const lang = i18n.language ?? "en";
  const dateFormatted = formatLongMonthDisplayDate(input.expiresAtIso, lang);
  const data = {
    openShop: true,
    premiumExpiryKind: input.kind,
  };

  for (const daysBefore of PREMIUM_EXPIRY_NOTIFICATION_OFFSETS_DAYS) {
    const triggerDate = resolveTriggerDate(input.expiresAtIso, daysBefore);
    if (!triggerDate) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(input.kind, daysBefore),
      content: {
        title: APP_DISPLAY_NAME,
        body: notificationBody(
          input.kind,
          daysBefore,
          dateFormatted,
          input.willRenew,
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
