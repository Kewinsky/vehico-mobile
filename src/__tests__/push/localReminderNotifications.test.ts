import * as Notifications from "expo-notifications";
import { i18n } from "../../i18n/i18n";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../../services/push/localReminderNotifications";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: "DATE" },
}));

jest.mock("../../i18n/i18n", () => ({
  i18n: {
    language: "en",
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === "reminders.localNotification.defaultTitle") return "Reminder";
      if (key === "reminders.localNotification.onDueDay")
        return `Due ${String(vars?.title)} ${String(vars?.date)}`;
      if (key === "reminders.localNotification.daysBefore")
        return `Before ${String(vars?.when)} ${String(vars?.date)}`;
      return key;
    },
  },
}));

jest.mock("../../utils/dateFormatting", () => ({
  formatLongMonthDisplayDate: jest.fn(() => "Jan 1, 2025"),
}));

describe("localReminderNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.language = "en";
  });

  it("does nothing when due_date missing", async () => {
    await scheduleLocalReminder({
      id: "r1",
      vehicle_id: "v1",
      due_date: null,
      days_before: null,
      title: "x",
      status: "active",
      channel_push: true,
      enabled: true,
    });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does nothing when reminder is inactive or push disabled", async () => {
    await scheduleLocalReminder({
      id: "r1",
      vehicle_id: "v1",
      due_date: "2025-01-10",
      days_before: null,
      title: "x",
      status: "done",
      channel_push: true,
      enabled: true,
    });
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns early when user denies permissions", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    await scheduleLocalReminder({
      id: "r1",
      vehicle_id: "v1",
      due_date: "2025-01-10",
      days_before: null,
      title: "x",
      status: "active",
      channel_push: true,
      enabled: true,
    });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("schedules before + due notifications when future and days_before > 0", async () => {
    jest.spyOn(Date, "now").mockReturnValue(
      new Date("2025-01-01T08:00:00Z").getTime(),
    );
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("id");

    await scheduleLocalReminder({
      id: "r1",
      vehicle_id: "v1",
      due_date: "2025-01-10",
      days_before: 2,
      title: "  ",
      status: "active",
      channel_push: true,
      enabled: true,
    });

    // first cancel called
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "vehico-reminder-r1",
    );
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "vehico-reminder-before-r1",
    );

    // before notification (identifier)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "vehico-reminder-before-r1",
      }),
    );
    // on due date notification (identifier)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "vehico-reminder-r1",
      }),
    );
  });

  it("cancelLocalReminder ignores errors", async () => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
      new Error("missing"),
    );
    await expect(cancelLocalReminder("r1")).resolves.toBeUndefined();
  });
});

