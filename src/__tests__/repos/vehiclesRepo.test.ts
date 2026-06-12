import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  syncVehicleMileageIfHigher,
  updateVehicle,
} from "../../services/vehicles/vehiclesRepo";
import {
  createPostgrestChain,
  mockStorageBucket,
  supabase,
} from "../../test/supabaseMock";

describe("vehiclesRepo", () => {
  it("listVehicles selects ordered by created_at desc", async () => {
    const rows = [{ id: "v1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    const out = await listVehicles();

    expect(supabase.from).toHaveBeenCalledWith("vehicles");
    expect(out).toEqual(rows);
  });

  it("getVehicle loads single row", async () => {
    const row = { id: "v1", make: "Audi" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    await expect(getVehicle("v1")).resolves.toEqual(row);
  });

  it("createVehicle calls create_vehicle RPC", async () => {
    const row = { id: "v1", make: "BMW", model: "320", production_year: 2020 };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await createVehicle({
      type: "car",
      vin: null,
      make: "BMW",
      model: "320",
      production_year: 2020,
      mileage: 50_000,
      fuel_type: "petrol",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_vehicle",
      expect.objectContaining({
        p_type: "car",
        p_make: "BMW",
        p_model: "320",
        p_production_year: 2020,
        p_mileage: 50_000,
        p_fuel_type: "petrol",
      }),
    );
    expect(out).toEqual(row);
  });

  it("updateVehicle patches row", async () => {
    const row = { id: "v1", notes: "x" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    await expect(updateVehicle("v1", { notes: "x" })).resolves.toEqual(row);
  });

  it("syncVehicleMileageIfHigher updates vehicle when entry mileage is higher", async () => {
    jest
      .mocked(supabase.from)
      .mockImplementationOnce(() =>
        createPostgrestChain({
          data: { id: "v1", mileage: 100_000 },
          error: null,
        }),
      )
      .mockImplementationOnce(() =>
        createPostgrestChain({
          data: { id: "v1", mileage: 105_000, mileage_updated_at: "2025-06-01" },
          error: null,
        }),
      );

    await expect(
      syncVehicleMileageIfHigher("v1", 105_000, "2025-06-01"),
    ).resolves.toBe(true);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("syncVehicleMileageIfHigher skips when entry mileage is not higher", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: { id: "v1", mileage: 120_000 },
        error: null,
      }),
    );

    await expect(
      syncVehicleMileageIfHigher("v1", 110_000, "2025-06-01"),
    ).resolves.toBe(false);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("deleteVehicle removes photo objects then deletes vehicle", async () => {
    jest.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "photos") {
        return createPostgrestChain({
          data: [{ storage_bucket: "images", storage_path: "v1/p.jpg" }],
          error: null,
        });
      }
      return createPostgrestChain({ data: null, error: null });
    });
    mockStorageBucket.remove.mockResolvedValue({ error: null });

    await deleteVehicle("v1");

    expect(mockStorageBucket.remove).toHaveBeenCalledWith(["v1/p.jpg"]);
    expect(supabase.from).toHaveBeenCalledWith("vehicles");
  });
});
