import { getReminderProgressPercent } from "../../services/reminders/reminderProgress";

function reminder(overrides: Record<string, unknown>) {
  return {
    due_date: null,
    due_mileage: null,
    recurrence_anchor_mileage: null,
    created_at: null,
    ...overrides,
  } as any;
}

describe("getReminderProgressPercent", () => {
  it("returns 0 when reminder has no date or mileage target", () => {
    const result = getReminderProgressPercent(
      reminder({}),
      null,
      new Date("2026-01-10T12:00:00Z"),
    );
    expect(result).toBe(0);
  });

  it("calculates progress from due date window", () => {
    const result = getReminderProgressPercent(
      reminder({
        created_at: "2026-01-01T00:00:00Z",
        due_date: "2026-01-11T00:00:00Z",
      }),
      null,
      new Date("2026-01-06T00:00:00Z"),
    );
    expect(result).toBe(50);
  });

  it("calculates progress from mileage target", () => {
    const result = getReminderProgressPercent(
      reminder({
        recurrence_anchor_mileage: 100,
        due_mileage: 200,
      }),
      150,
      new Date("2026-01-06T00:00:00Z"),
    );
    expect(result).toBe(50);
  });

  it("prefers date progress when date target is more urgent", () => {
    const result = getReminderProgressPercent(
      reminder({
        created_at: "2026-01-01T00:00:00Z",
        due_date: "2026-01-11T00:00:00Z",
        recurrence_anchor_mileage: 0,
        due_mileage: 100,
      }),
      40,
      new Date("2026-01-09T00:00:00Z"),
    );
    expect(result).toBe(80);
  });

  it("prefers mileage progress when mileage target is more urgent", () => {
    const result = getReminderProgressPercent(
      reminder({
        created_at: "2026-01-01T00:00:00Z",
        due_date: "2026-01-11T00:00:00Z",
        recurrence_anchor_mileage: 0,
        due_mileage: 100,
      }),
      90,
      new Date("2026-01-06T00:00:00Z"),
    );
    expect(result).toBe(90);
  });

  it("clamps to 100 when target is already exceeded", () => {
    const result = getReminderProgressPercent(
      reminder({
        recurrence_anchor_mileage: 0,
        due_mileage: 100,
      }),
      160,
      new Date("2026-01-06T00:00:00Z"),
    );
    expect(result).toBe(100);
  });
});
