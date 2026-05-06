import {
  createFuelingEntry,
  deleteFuelingEntry,
  getFuelingEntry,
  listFuelingEntries,
  updateFuelingEntry,
} from "../../services/fuel/fuelingEntriesRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("fuelingEntriesRepo", () => {
  it("listFuelingEntries scopes to vehicle", async () => {
    const rows = [{ id: "f1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );
    await expect(listFuelingEntries("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("fueling_entries");
  });

  it("getFuelingEntry throws when row missing", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(getFuelingEntry("missing")).rejects.toThrow(
      "Fueling entry not found",
    );
  });

  it("createFuelingEntry inserts", async () => {
    const row = {
      id: "f1",
      vehicle_id: "v1",
      date: "2025-05-01",
      distance: 400,
      fuel_amount: 40,
      fuel_cost: 200,
    };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    const out = await createFuelingEntry({
      vehicle_id: "v1",
      date: "2025-05-01",
      distance: 400,
      fuel_amount: 40,
      fuel_cost: 200,
      fuel_type: null,
      gas_station: null,
    });

    expect(out).toEqual(row);
  });

  it("updateFuelingEntry throws when RLS blocks update", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(
      updateFuelingEntry("f1", { fuel_cost: 1 }),
    ).rejects.toThrow(/could not be updated/);
  });

  it("deleteFuelingEntry deletes", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteFuelingEntry("f1")).resolves.toBeUndefined();
  });
});
