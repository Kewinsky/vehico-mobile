import { getRecurrenceAdvancePatch } from "../../services/reminders/remindersRepo";
import type { Reminder } from "../../types/domain";

function baseReminder(partial: Partial<Reminder>): Reminder {
  return {
    id: "r1",
    vehicle_id: "v1",
    due_date: "2025-01-01",
    due_mileage: 10000,
    days_before: null,
    title: null,
    notes: null,
    status: "active",
    channel_email: true,
    channel_push: true,
    enabled: true,
    delivered_at: null,
    created_at: "2025-01-01T00:00:00Z",
    recurrence_interval_value: null,
    recurrence_interval_unit: null,
    recurrence_interval_km: null,
    recurrence_anchor_mileage: null,
    ...partial,
  };
}

describe("getRecurrenceAdvancePatch", () => {
  it("returns null when no recurrence", () => {
    expect(getRecurrenceAdvancePatch(baseReminder({}))).toBeNull();
  });

  it("advances due_date by days interval", () => {
    const patch = getRecurrenceAdvancePatch(
      baseReminder({
        recurrence_interval_value: 7,
        recurrence_interval_unit: "days",
        due_date: "2025-01-01",
      }),
    );
    expect(patch).toEqual({
      status: "active",
      due_date: "2025-01-08",
    });
  });

  it("advances due_mileage and sets anchor when mileage recurrence", () => {
    const patch = getRecurrenceAdvancePatch(
      baseReminder({
        recurrence_interval_km: 5000,
        due_mileage: 20000,
      }),
    );
    expect(patch).toEqual({
      status: "active",
      recurrence_anchor_mileage: 20000,
      due_mileage: 25000,
    });
  });

  it("combines time + mileage recurrence when both set", () => {
    const patch = getRecurrenceAdvancePatch(
      baseReminder({
        recurrence_interval_value: 1,
        recurrence_interval_unit: "months",
        due_date: "2025-01-15",
        recurrence_interval_km: 10000,
        due_mileage: 50000,
      }),
    );
    expect(patch?.status).toBe("active");
    expect(patch?.due_date).toBe("2025-02-15");
    expect(patch?.due_mileage).toBe(60000);
    expect(patch?.recurrence_anchor_mileage).toBe(50000);
  });
});
