import {
  createServiceEntry,
  deleteServiceEntry,
  getServiceEntry,
  listServiceEntries,
  updateServiceEntry,
} from "../../services/serviceEntries/serviceEntriesRepo";
import { deleteAttachmentsForServiceEntry } from "../../services/attachments/serviceEntryAttachmentsCleanup";
import { syncVehicleMileageIfHigher } from "../../services/vehicles/vehiclesRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

jest.mock("../../services/attachments/serviceEntryAttachmentsCleanup", () => ({
  deleteAttachmentsForServiceEntry: jest.fn(),
}));

jest.mock("../../services/vehicles/vehiclesRepo", () => {
  const actual = jest.requireActual("../../services/vehicles/vehiclesRepo");
  return {
    ...actual,
    syncVehicleMileageIfHigher: jest.fn(),
  };
});

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
    expect(syncVehicleMileageIfHigher).toHaveBeenCalledWith(
      "v1",
      1000,
      "2025-05-01",
    );
  });

  it("getServiceEntry loads single", async () => {
    const row = { id: "se1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getServiceEntry("se1")).resolves.toEqual(row);
  });

  it("updateServiceEntry patches row and syncs mileage when provided", async () => {
    const row = {
      id: "se1",
      title: "Brakes",
      vehicle_id: "v1",
      service_date: "2025-06-01",
    };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(
      updateServiceEntry("se1", { title: "Brakes", mileage: 120_000 }),
    ).resolves.toEqual(row);
    expect(syncVehicleMileageIfHigher).toHaveBeenCalledWith(
      "v1",
      120_000,
      "2025-06-01",
    );
  });

  it("deleteServiceEntry deletes local attachments then server row", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteServiceEntry("se1")).resolves.toBeUndefined();
    expect(deleteAttachmentsForServiceEntry).toHaveBeenCalledWith("se1");
  });
});
