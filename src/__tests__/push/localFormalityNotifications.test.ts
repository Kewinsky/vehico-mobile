import * as Notifications from "expo-notifications";
import { i18n } from "../../i18n/i18n";
import {
  cancelFormalityNotifications,
  scheduleFormalityNotifications,
} from "../../services/push/localFormalityNotifications";

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: "DATE" },
}));

jest.mock("../../i18n/i18n", () => ({
  i18n: {
    language: "en",
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === "dashboard.formalityNotification.insuranceBefore") {
        return `${String(vars?.vehicle)} insurance ${String(vars?.days)} ${String(vars?.date)}`;
      }
      if (key === "dashboard.formalityNotification.insuranceToday") {
        return `${String(vars?.vehicle)} insurance today`;
      }
      return key;
    },
  },
}));

jest.mock("../../utils/dateFormatting", () => ({
  formatLongMonthDisplayDate: jest.fn(() => "Jun 20, 2025"),
}));

describe("localFormalityNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.language = "en";
  });

  it("cancels and skips scheduling when validUntil is empty", async () => {
    await scheduleFormalityNotifications({
      vehicleId: "v1",
      vehicleLabel: "BMW 530d",
      kind: "insurance",
      validUntil: null,
    });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "vehico-formality-insurance-v1-7",
    );
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("schedules 7d, 3d and due-day notifications when in the future", async () => {
    jest.spyOn(Date, "now").mockReturnValue(
      new Date("2025-06-01T08:00:00Z").getTime(),
    );
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("id");

    await scheduleFormalityNotifications({
      vehicleId: "v1",
      vehicleLabel: "BMW 530d",
      kind: "insurance",
      validUntil: "2025-06-20",
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "vehico-formality-insurance-v1-7",
      }),
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "vehico-formality-insurance-v1-3",
      }),
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "vehico-formality-insurance-v1-0",
      }),
    );
  });

  it("cancelFormalityNotifications ignores missing identifiers", async () => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(
      new Error("missing"),
    );
    await expect(
      cancelFormalityNotifications("v1", "inspection"),
    ).resolves.toBeUndefined();
  });
});
