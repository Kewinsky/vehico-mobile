import {
  createServiceEntry,
  deleteServiceEntry,
  getServiceEntry,
  listServiceEntries,
  updateServiceEntry,
} from "../../services/serviceEntries/serviceEntriesRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("serviceEntriesRepo", () => {
  it("listServiceEntries scopes to vehicle and orders", async () => {
    const rows = [{ id: "se1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    await expect(listServiceEntries("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("service_entries");
  });

  it("createServiceEntry inserts row", async () => {
    const row = { id: "se1", title: "Oil" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    const out = await createServiceEntry({
      vehicle_id: "v1",
      service_date: "2025-05-01",
      mileage: 1000,
      category: "oil_change",
      title: "Oil",
      description: "",
      cost: null,
    });

    expect(out).toEqual(row);
  });

  it("getServiceEntry loads single", async () => {
    const row = { id: "se1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getServiceEntry("se1")).resolves.toEqual(row);
  });

  it("updateServiceEntry patches row", async () => {
    const row = { id: "se1", title: "Brakes" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(
      updateServiceEntry("se1", { title: "Brakes" }),
    ).resolves.toEqual(row);
  });

  it("deleteServiceEntry deletes by id", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteServiceEntry("se1")).resolves.toBeUndefined();
  });
});
