import {
  createVehicleWheel,
  deleteVehicleWheel,
  getVehicleWheel,
  listVehicleWheels,
  updateVehicleWheel,
} from "../../services/wheels/wheelsRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("wheelsRepo", () => {
  it("listVehicleWheels returns [] when freePlanWheelId blank", async () => {
    await expect(
      listVehicleWheels("v1", { freePlanWheelId: "" }),
    ).resolves.toEqual([]);
  });

  it("createVehicleWheel maps RPC args", async () => {
    const row = { id: "w1" };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await createVehicleWheel({
      vehicle_id: "v1",
      name: "OEM",
      width_inch: 8,
      diameter_inch: 18,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_wheel",
      expect.objectContaining({
        p_vehicle_id: "v1",
        p_diameter_inch: 18,
      }),
    );
    expect(out).toEqual(row);
  });

  it("createVehicleWheel normalizes fitted limit message", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "FITTED_WHEEL_LIMIT_REACHED" },
    });

    await expect(
      createVehicleWheel({
        vehicle_id: "v1",
        name: "x",
        width_inch: 8,
        diameter_inch: 18,
      }),
    ).rejects.toThrow("FITTED_WHEEL_LIMIT_REACHED");
  });

  it("updateVehicleWheel blocks third fitted wheel set", async () => {
    supabase.from
      .mockImplementationOnce(() =>
        createPostgrestChain({
          data: { id: "w1", vehicle_id: "v1" },
          error: null,
        }),
      )
      .mockImplementationOnce(() =>
        createPostgrestChain({ count: 2, error: null }),
      );

    await expect(
      updateVehicleWheel("w1", { is_currently_fitted: true }),
    ).rejects.toThrow("FITTED_WHEEL_LIMIT_REACHED");
  });

  it("getVehicleWheel loads single", async () => {
    const row = { id: "w1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getVehicleWheel("w1")).resolves.toEqual(row);
  });

  it("deleteVehicleWheel deletes by id", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteVehicleWheel("w1")).resolves.toBeUndefined();
  });
});
