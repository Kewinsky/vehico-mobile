import {
  insertMileageAudit,
  listMileageAudit,
} from "../../services/mileage/mileageAuditRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("mileageAuditRepo", () => {
  it("listMileageAudit loads rows for vehicle", async () => {
    const rows = [
      {
        id: "r1",
        vehicle_id: "v1",
        reading_date: "2025-06-01",
        mileage: 100_000,
        source: "profile",
      },
    ];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    const out = await listMileageAudit("v1");

    expect(supabase.from).toHaveBeenCalledWith("mileage_audit");
    expect(out).toEqual(rows);
  });

  it("insertMileageAudit inserts profile row", async () => {
    const row = {
      id: "r1",
      vehicle_id: "v1",
      reading_date: "2025-06-01",
      mileage: 105_000,
      source: "profile",
    };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    const out = await insertMileageAudit({
      vehicle_id: "v1",
      reading_date: "2025-06-01T12:00:00",
      mileage: 105_000,
    });

    expect(out).toEqual(row);
  });
});
