import {
  createWorkshop,
  deleteWorkshop,
  getWorkshop,
  listWorkshops,
  updateWorkshop,
} from "../../services/workshops/workshopsRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("workshopsRepo", () => {
  it("listWorkshops returns [] when freePlanWorkshopIds is empty", async () => {
    await expect(listWorkshops({ freePlanWorkshopIds: [] })).resolves.toEqual(
      [],
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("listWorkshops filters by id list when freePlanWorkshopIds set", async () => {
    const rows = [{ id: "w1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    const out = await listWorkshops({ freePlanWorkshopIds: ["w1"] });
    expect(out).toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("workshops");
  });

  it("createWorkshop uses RPC", async () => {
    const row = { id: "w1", name: "Garage" };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await createWorkshop({
      name: "Garage",
      workshop_type: "mechanic",
      phone_number: "123",
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_workshop",
      expect.objectContaining({
        p_name: "Garage",
        p_workshop_type: "mechanic",
        p_phone_number: "123",
      }),
    );
    expect(out).toEqual(row);
  });

  it("getWorkshop loads single", async () => {
    const row = { id: "w1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getWorkshop("w1")).resolves.toEqual(row);
  });

  it("updateWorkshop patches row", async () => {
    const row = { id: "w1", name: "New" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(updateWorkshop("w1", { name: "New" })).resolves.toEqual(row);
  });

  it("deleteWorkshop deletes by id", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteWorkshop("w1")).resolves.toBeUndefined();
  });
});
