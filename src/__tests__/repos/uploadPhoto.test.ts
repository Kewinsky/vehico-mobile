import {
  deleteVehiclePhoto,
  getVehiclePhotoUrl,
  listVehiclePhotos,
  listVehiclePhotosForVehicles,
  reorderVehiclePhotos,
} from "../../services/vehicles/uploadPhoto";
import { createPostgrestChain, mockStorageBucket, supabase } from "../../test/supabaseMock";
import type { VehiclePhoto } from "../../types/domain";

describe("uploadPhoto (storage + photos table)", () => {
  it("listVehiclePhotos loads ordered rows", async () => {
    const rows = [{ id: "ph1" }];
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    await expect(listVehiclePhotos("v1")).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith("photos");
  });

  it("listVehiclePhotos accepts limit option without throwing", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: [{ id: "1" }], error: null }),
    );

    await expect(listVehiclePhotos("v1", { limit: 1 })).resolves.toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith("photos");
  });

  it("listVehiclePhotosForVehicles groups by vehicle_id with per-vehicle limit", async () => {
    const rows = [
      { id: "a", vehicle_id: "v1", display_order: 0 },
      { id: "b", vehicle_id: "v1", display_order: 1 },
      { id: "c", vehicle_id: "v2", display_order: 0 },
    ] as unknown as VehiclePhoto[];

    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: rows, error: null }),
    );

    const map = await listVehiclePhotosForVehicles(["v1", "v2"], {
      limit: 1,
    });

    expect(map.get("v1")?.map((p) => p.id)).toEqual(["a"]);
    expect(map.get("v2")?.map((p) => p.id)).toEqual(["c"]);
  });

  it("deleteVehiclePhoto removes storage object then DB row", async () => {
    mockStorageBucket.remove.mockResolvedValue({ error: null });
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: null }),
    );

    const photo = {
      id: "ph1",
      storage_bucket: "images",
      storage_path: "v1/x.jpg",
    } as VehiclePhoto;

    await deleteVehiclePhoto(photo);

    expect(mockStorageBucket.remove).toHaveBeenCalledWith(["v1/x.jpg"]);
    expect(supabase.from).toHaveBeenCalledWith("photos");
  });

  it("reorderVehiclePhotos propagates first update error", async () => {
    const ok = createPostgrestChain({ data: null, error: null });
    const bad = createPostgrestChain({
      data: null,
      error: { message: "rls" },
    });
    supabase.from.mockImplementationOnce(() => ok).mockImplementationOnce(() => bad);

    await expect(
      reorderVehiclePhotos("v1", ["p1", "p2"]),
    ).rejects.toEqual(expect.objectContaining({ message: "rls" }));
  });

  it("getVehiclePhotoUrl uses storage public URL helper", () => {
    const photo = {
      storage_bucket: "images",
      storage_path: "v1/a.jpg",
    } as VehiclePhoto;

    expect(getVehiclePhotoUrl(photo)).toBe(
      "https://example.test/storage-public",
    );
    expect(mockStorageBucket.getPublicUrl).toHaveBeenCalledWith("v1/a.jpg");
  });
});
