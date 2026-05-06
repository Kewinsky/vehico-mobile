import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
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
