import {
  createVehicleTire,
  deleteVehicleTire,
  getVehicleTire,
  listVehicleTires,
  updateVehicleTire,
} from "../../services/tires/tiresRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("tiresRepo", () => {
  it("listVehicleTires returns [] when freePlanTireId blank", async () => {
    await expect(
      listVehicleTires("v1", { freePlanTireId: "" }),
    ).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("listVehicleTires single-id mode uses maybeSingle", async () => {
    const row = { id: "t1", vehicle_id: "v1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    const out = await listVehicleTires("v1", { freePlanTireId: "t1" });
    expect(out).toEqual([row]);
  });

  it("createVehicleTire maps RPC args", async () => {
    const row = { id: "t1" };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await createVehicleTire({
      vehicle_id: "v1",
      name: "Pilot",
      width_mm: 225,
      aspect_ratio: 45,
      diameter_inch: 17,
      tire_type: "summer",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_tire",
      expect.objectContaining({
        p_vehicle_id: "v1",
        p_width_mm: 225,
      }),
    );
    expect(out).toEqual(row);
  });

  it("createVehicleTire normalizes fitted limit message", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "... FITTED_TIRE_LIMIT_REACHED ..." },
    });

    await expect(
      createVehicleTire({
        vehicle_id: "v1",
        name: "x",
        width_mm: 1,
        aspect_ratio: 1,
        diameter_inch: 1,
        tire_type: "summer",
      }),
    ).rejects.toThrow("FITTED_TIRE_LIMIT_REACHED");
  });

  it("updateVehicleTire blocks third fitted tire", async () => {
    supabase.from
      .mockImplementationOnce(() =>
        createPostgrestChain({
          data: { id: "t1", vehicle_id: "v1" },
          error: null,
        }),
      )
      .mockImplementationOnce(() =>
        createPostgrestChain({ count: 2, error: null }),
      );

    await expect(
      updateVehicleTire("t1", { is_currently_fitted: true }),
    ).rejects.toThrow("FITTED_TIRE_LIMIT_REACHED");
  });

  it("getVehicleTire loads single", async () => {
    const row = { id: "t1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getVehicleTire("t1")).resolves.toEqual(row);
  });

  it("deleteVehicleTire deletes by id", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteVehicleTire("t1")).resolves.toBeUndefined();
  });
});
