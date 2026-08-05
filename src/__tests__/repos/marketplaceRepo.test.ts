import {
  generateMarketplacePost,
  listMarketplacePosts,
  saveMarketplacePost,
  updateMarketplacePost,
  updateMarketplacePostTitle,
  getMarketplacePost,
  deleteMarketplacePost,
} from "../../services/marketplace/marketplaceRepo";
import { createPostgrestChain, supabase } from "../../test/supabaseMock";

describe("marketplaceRepo", () => {
  it("generateMarketplacePost invokes edge function with mapped flags", async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { content: { pl: "p", en: "e" } },
      error: null,
    });

    const content = await generateMarketplacePost({
      vehicleId: "v1",
      reportOptions: {
        include_technical_data: true,
        include_insurance: false,
        include_ac: false,
        include_inspection: false,
        include_modifications: false,
        include_equipment: false,
        include_notes: true,
        include_wheels: true,
        include_tires: false,
        include_service_history: true,
        include_service_stats: false,
        include_fueling_stats: false,
      },
      includePrice: true,
      price: 100,
      currency: "PLN",
      includePublicReport: true,
      publicReportUrl: "https://x/y",
    });

    expect(content).toEqual({ pl: "p", en: "e" });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "generate-marketplace-post",
      expect.objectContaining({
        body: expect.objectContaining({
          vehicleId: "v1",
          includeWheels: true,
          includeTires: false,
          includeNotes: true,
          publicReportUrl: "https://x/y",
        }),
      }),
    );
  });

  it("generateMarketplacePost throws when content missing", async () => {
    supabase.functions.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(
      generateMarketplacePost({
        vehicleId: "v1",
        reportOptions: {
          include_technical_data: false,
          include_insurance: false,
          include_ac: false,
          include_inspection: false,
          include_modifications: false,
          include_equipment: false,
          include_notes: false,
          include_wheels: false,
          include_tires: false,
          include_service_history: false,
          include_service_stats: false,
          include_fueling_stats: false,
        },
        includePrice: false,
        price: null,
        currency: "PLN",
        includePublicReport: false,
        publicReportUrl: null,
      }),
    ).rejects.toThrow(/Failed to generate marketplace post/);
  });

  it("saveMarketplacePost requires authenticated user", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      saveMarketplacePost({
        vehicleId: "v1",
        content: { pl: "a", en: "b" },
      }),
    ).rejects.toThrow(/not authenticated/);
  });

  it("saveMarketplacePost calls create_marketplace_post RPC", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const row = { id: "p1", vehicle_id: "v1" };
    supabase.rpc.mockResolvedValue({ data: row, error: null });

    const out = await saveMarketplacePost({
      vehicleId: "v1",
      platform: "facebook",
      price: 9000,
      content: { pl: "x", en: "y" },
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_marketplace_post",
      expect.objectContaining({
        p_vehicle_id: "v1",
        p_platform: "facebook",
        p_price: 9000,
      }),
    );
    expect(out).toEqual(row);
  });

  it("listMarketplacePosts orders newest first", async () => {
    const rows = [{ id: "p1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );
    await expect(listMarketplacePosts("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("posts");
  });

  it("getMarketplacePost loads single", async () => {
    const row = { id: "p1" };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );
    await expect(getMarketplacePost("p1")).resolves.toEqual(row);
  });

  it("updateMarketplacePost updates content + updated_at", async () => {
    const row = { id: "p1", content: { pl: "n", en: "n2" } };
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: row, error: null }),
    );

    await expect(
      updateMarketplacePost("p1", { pl: "n", en: "n2" }),
    ).resolves.toEqual(row);
  });

  it("updateMarketplacePostTitle updates title only", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(
      updateMarketplacePostTitle("p1", "My title"),
    ).resolves.toBeUndefined();
  });

  it("deleteMarketplacePost deletes post row", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );
    await expect(deleteMarketplacePost("p1")).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("posts");
  });

  it("deleteMarketplacePost throws on delete error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "delete failed" } }),
    );
    await expect(deleteMarketplacePost("p1")).rejects.toEqual(
      expect.objectContaining({ message: "delete failed" }),
    );
  });
});
