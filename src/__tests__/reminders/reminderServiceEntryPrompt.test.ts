import {
  createServiceEntryFromReminder,
  serviceEntryInputFromReminder,
} from "../../services/reminders/reminderServiceEntryPrompt";
import { createServiceEntry } from "../../services/serviceEntries/serviceEntriesRepo";
import type { Reminder } from "../../types/domain";

jest.mock("../../services/serviceEntries/serviceEntriesRepo", () => ({
  createServiceEntry: jest.fn(),
}));

const baseReminder = (patch: Partial<Reminder> = {}): Reminder => ({
  id: "r1",
  vehicle_id: "v1",
  title: "Olej silnikowy",
  notes: null,
  due_date: "2026-03-15",
  due_mileage: 120000,
  days_before: 7,
  status: "active",
  channel_email: true,
  channel_push: true,
  enabled: true,
  recurrence_interval_value: null,
  recurrence_interval_unit: null,
  recurrence_interval_km: null,
  recurrence_anchor_mileage: null,
  created_at: "2026-01-01T00:00:00Z",
  ...patch,
});

describe("reminderServiceEntryPrompt", () => {
  it("maps reminder fields to service entry input", () => {
    expect(serviceEntryInputFromReminder(baseReminder())).toEqual({
      vehicle_id: "v1",
      service_date: "2026-03-15",
      mileage: 120000,
      category: "other",
      title: "Olej silnikowy",
      description: "",
      cost: null,
    });
  });

  it("uses today when reminder has no due date", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-12T12:00:00Z"));
    const input = serviceEntryInputFromReminder(
      baseReminder({ due_date: null }),
    );
    expect(input.service_date).toBe("2026-06-12");
    jest.useRealTimers();
  });

  it("createServiceEntryFromReminder delegates to createServiceEntry", async () => {
    jest.mocked(createServiceEntry).mockResolvedValue({} as any);
    const reminder = baseReminder();
    await createServiceEntryFromReminder(reminder);
    expect(createServiceEntry).toHaveBeenCalledWith(
      serviceEntryInputFromReminder(reminder),
    );
  });
});
