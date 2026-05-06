jest.mock("../../config/env", () => ({
  ENV: {
    SUPABASE_URL: "https://supabase.test",
    SUPABASE_ANON_KEY: "anon",
    REPORTS_APP_URL: "https://reports.test",
  },
}));

import {
  generatePublicPageWithOptions,
  getPublicPageUrl,
  listPublicPages,
  updatePublicReportTempPhotos,
  updatePublicReportTitle,
} from "../../services/publicPages/publicPagesRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("publicPagesRepo", () => {
  it("getPublicPageUrl builds reports app URL", async () => {
    await expect(getPublicPageUrl("abc123")).resolves.toBe(
      "https://reports.test/report/abc123",
    );
  });

  it("generatePublicPageWithOptions calls create_report_snapshot RPC", async () => {
    const snapshot = { id: "rep1", public_id: "pub1" };
    supabase.rpc.mockResolvedValue({ data: snapshot, error: null });

    const out = await generatePublicPageWithOptions(
      "v1",
      ["photo-1"],
      [{ storage_path: "x.jpg", display_order: 0 }],
      {
        include_technical_data: true,
        include_insurance: true,
        include_inspection: true,
        include_notes: false,
        include_wheels: false,
        include_tires: false,
        include_service_history: true,
        include_service_stats: false,
        include_fueling_stats: false,
        include_photos: true,
      },
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_report_snapshot",
      expect.objectContaining({
        p_vehicle_id: "v1",
      }),
    );
    expect(out).toEqual(snapshot);
  });

  it("listPublicPages selects reports for vehicle", async () => {
    const rows = [{ id: "r1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );
    await expect(listPublicPages("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("reports");
  });

  it("updatePublicReportTempPhotos calls RPC", async () => {
    const snapshot = { id: "rep1" };
    supabase.rpc.mockResolvedValue({ data: snapshot, error: null });

    const out = await updatePublicReportTempPhotos("rep1", [
      { storage_path: "t.jpg", display_order: 1 },
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_report_temp_photos",
      expect.objectContaining({
        p_report_id: "rep1",
      }),
    );
    expect(out).toEqual(snapshot);
  });

  it("updatePublicReportTitle patches reports row", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(
      updatePublicReportTitle("rep1", "Title"),
    ).resolves.toBeUndefined();
  });
});
