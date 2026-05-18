import { computeOilChangeDueState } from "../../utils/oilChangeDue";
import type { ServiceEntry } from "../../types/domain";

function oilEntry(
  overrides: Partial<ServiceEntry> & Pick<ServiceEntry, "service_date">,
): ServiceEntry {
  return {
    id: "1",
    vehicle_id: "v1",
    mileage: 50_000,
    category: "oil_change",
    title: "Oil",
    description: "",
    cost: null,
    workshop_id: null,
    workshop_snapshot: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeOilChangeDueState", () => {
  it("shows banner when no oil change recorded", () => {
    const state = computeOilChangeDueState([], 60_000);
    expect(state.showBanner).toBe(true);
    expect(state.lastOilChange).toBeNull();
  });

  it("shows banner within 7 days of due date", () => {
    const dueSoon = new Date();
    dueSoon.setDate(dueSoon.getDate() - 360);
    const state = computeOilChangeDueState(
      [oilEntry({ service_date: dueSoon.toISOString().slice(0, 10) })],
      59_500,
    );
    expect(state.showBanner).toBe(true);
    expect(state.isOverdue).toBe(false);
  });

  it("hides banner when far from due", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 30);
    const state = computeOilChangeDueState(
      [oilEntry({ service_date: recent.toISOString().slice(0, 10), mileage: 40_000 })],
      45_000,
    );
    expect(state.showBanner).toBe(false);
  });
});
