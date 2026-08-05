import {
  generatePublicPageWithOptions,
  getPublicPageUrl,
  listPublicPages,
  updatePublicReportPhotos,
  updatePublicReportTitle,
  deletePublicReport,
} from "../../services/publicPages/publicPagesRepo";
import {
  createPostgrestChain,
  mockStorageBucket,
  supabase,
} from "../../test/supabaseMock";

jest.mock("../../config/env", () => ({
  ENV: {
    SUPABASE_URL: "https://supabase.test",
    SUPABASE_ANON_KEY: "anon",
    REPORTS_APP_URL: "https://reports.test",
  },
}));

describe("publicPagesRepo", () => {
  it("getPublicPageUrl builds reports app URL", async () => {
    await expect(getPublicPageUrl("abc123")).resolves.toBe(
      "https://reports.test/report/abc123",
    );
  });

  it("generatePublicPageWithOptions calls create_report_snapshot RPC", async () => {
    const snapshot = { id: "rep1", public_id: "pub1" };
    supabase.rpc.mockResolvedValue({ data: snapshot, error: null });

    const out = await generatePublicPageWithOptions("v1", {
      include_technical_data: true,
      include_insurance: true,
      include_ac: true,
      include_inspection: true,
      include_modifications: false,
      include_equipment: false,
      include_notes: false,
      include_wheels: false,
      include_tires: false,
      include_service_history: true,
      include_service_stats: false,
      include_fueling_stats: false,
      include_expenses_by_category_chart: false,
      include_expenses_over_time_chart: false,
      include_mileage_over_time_chart: false,
      include_photos: true,
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_report_snapshot",
      expect.objectContaining({
        p_vehicle_id: "v1",
        p_report_options: expect.objectContaining({ include_photos: true }),
      }),
    );
    expect(out).toEqual(snapshot);
  });

  it("generatePublicPageWithOptions throws RPC error", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });
    await expect(
      generatePublicPageWithOptions("v1", {
        include_technical_data: true,
        include_insurance: true,
        include_inspection: true,
        include_notes: true,
        include_wheels: false,
        include_tires: false,
        include_equipment: false,
        include_service_history: false,
        include_service_stats: false,
        include_fueling_stats: false,
        include_expenses_by_category_chart: false,
        include_expenses_over_time_chart: false,
        include_mileage_over_time_chart: false,
        include_photos: true,
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "rpc failed" }));
  });

  it("listPublicPages selects reports for vehicle", async () => {
    const rows = [{ id: "r1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );
    await expect(listPublicPages("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("reports");
  });

  it("listPublicPages throws on query error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "select failed" } }),
    );
    await expect(listPublicPages("v1")).rejects.toEqual(
      expect.objectContaining({ message: "select failed" }),
    );
  });

  it("updatePublicReportPhotos calls RPC", async () => {
    const snapshot = { id: "rep1" };
    supabase.rpc.mockResolvedValue({ data: snapshot, error: null });

    const out = await updatePublicReportPhotos("rep1", [
      { storage_path: "rep1/t.jpg", display_order: 1 },
    ]);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_report_photos",
      expect.objectContaining({
        p_report_id: "rep1",
        p_photos_data: [{ storage_path: "rep1/t.jpg", display_order: 1 }],
      }),
    );
    expect(out).toEqual(snapshot);
  });

  it("updatePublicReportPhotos throws RPC error", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "photos failed" },
    });
    await expect(updatePublicReportPhotos("rep1", [])).rejects.toEqual(
      expect.objectContaining({ message: "photos failed" }),
    );
  });

  it("updatePublicReportTitle patches reports row", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(
      updatePublicReportTitle("rep1", "Title"),
    ).resolves.toBeUndefined();
  });

  it("updatePublicReportTitle throws on update error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "update failed" } }),
    );
    await expect(updatePublicReportTitle("rep1", "Title")).rejects.toEqual(
      expect.objectContaining({ message: "update failed" }),
    );
  });

  it("deletePublicReport removes report photos then deletes report row", async () => {
    mockStorageBucket.list.mockResolvedValue({
      data: [{ name: "photo.jpg" }],
      error: null,
    });
    mockStorageBucket.remove.mockResolvedValue({ data: null, error: null });
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );

    await expect(deletePublicReport("rep1")).resolves.toBeUndefined();

    expect(mockStorageBucket.list).toHaveBeenCalledWith("rep1");
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([
      "rep1/photo.jpg",
    ]);
    expect(supabase.from).toHaveBeenCalledWith("reports");
  });

  it("deletePublicReport throws when report delete fails", async () => {
    mockStorageBucket.list.mockResolvedValue({ data: [], error: null });
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "delete failed" } }),
    );
    await expect(deletePublicReport("rep1")).rejects.toEqual(
      expect.objectContaining({ message: "delete failed" }),
    );
  });
});
