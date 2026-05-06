jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("../../services/storage/uploadUtils", () => ({
  fetchBlob: jest.fn(),
  randomId: jest.fn(),
}));

import {
  uploadVehiclePhoto,
  deleteVehiclePhoto,
  getVehiclePhotoUrl,
  listVehiclePhotos,
  listVehiclePhotosForVehicles,
  reorderVehiclePhotos,
} from "../../services/vehicles/uploadPhoto";
import { createPostgrestChain, mockStorageBucket, supabase } from "../../test/supabaseMock";
import * as ImageManipulator from "expo-image-manipulator";
import { fetchBlob, randomId } from "../../services/storage/uploadUtils";
import type { VehiclePhoto } from "../../types/domain";

describe("uploadPhoto (storage + photos table)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///converted.jpg",
    });
    (fetchBlob as jest.Mock).mockResolvedValue("blob-data");
    (randomId as jest.Mock).mockReturnValue("rid");
    mockStorageBucket.upload.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it("listVehiclePhotos throws on query error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "select failed" } }),
    );
    await expect(listVehiclePhotos("v1")).rejects.toEqual(
      expect.objectContaining({ message: "select failed" }),
    );
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

  it("listVehiclePhotosForVehicles throws on query error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: null, error: { message: "select failed" } }),
    );
    await expect(listVehiclePhotosForVehicles(["v1"])).rejects.toEqual(
      expect.objectContaining({ message: "select failed" }),
    );
  });

  it("listVehiclePhotosForVehicles returns empty map for empty input", async () => {
    const map = await listVehiclePhotosForVehicles([]);
    expect(map.size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
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

  it("deleteVehiclePhoto throws when storage delete fails", async () => {
    mockStorageBucket.remove.mockResolvedValue({ error: { message: "storage fail" } });
    await expect(
      deleteVehiclePhoto({
        id: "ph1",
        vehicle_id: "v1",
        storage_bucket: "images",
        storage_path: "v1/x.jpg",
        display_order: 0,
        created_at: "x",
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "storage fail" }));
  });

  it("uploadVehiclePhoto fails when max photos reached", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: Array.from({ length: 2 }).map((_, i) => ({ id: `p${i}` })),
        error: null,
      }),
    );
    await expect(
      uploadVehiclePhoto({ vehicleId: "v1", fileUri: "file:///a", maxPhotos: 2 }),
    ).rejects.toThrow("Maximum 2 photos allowed");
  });

  it("uploadVehiclePhoto uploads jpeg and inserts metadata row", async () => {
    const selectChain = createPostgrestChain({ data: [], error: null });
    const insertChain = createPostgrestChain({
      data: {
        id: "ph-new",
        vehicle_id: "v1",
        storage_bucket: "images",
        storage_path: "v1/1700000000000-rid.jpg",
        display_order: 0,
        created_at: "2025-01-01",
      },
      error: null,
    });
    supabase.from.mockImplementationOnce(() => selectChain).mockImplementationOnce(() => insertChain);

    const out = await uploadVehiclePhoto({
      vehicleId: "v1",
      fileUri: "file:///a.png",
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///a.png",
      [],
      { compress: 0.9, format: "jpeg" },
    );
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      "v1/1700000000000-rid.jpg",
      "blob-data",
      { contentType: "image/jpeg", upsert: false },
    );
    expect(out.id).toBe("ph-new");
  });

  it("uploadVehiclePhoto maps missing bucket to friendly error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: [], error: null }),
    );
    mockStorageBucket.upload.mockResolvedValue({
      error: { message: "bucket not found" },
    });
    await expect(
      uploadVehiclePhoto({ vehicleId: "v1", fileUri: "file:///a.png" }),
    ).rejects.toThrow('Storage bucket "images" not found');
  });

  it("uploadVehiclePhoto rethrows non-bucket upload error", async () => {
    supabase.from.mockImplementation(() =>
      createPostgrestChain({ data: [], error: null }),
    );
    mockStorageBucket.upload.mockResolvedValue({
      error: { message: "permission denied" },
    });
    await expect(
      uploadVehiclePhoto({ vehicleId: "v1", fileUri: "file:///a.png" }),
    ).rejects.toEqual(expect.objectContaining({ message: "permission denied" }));
  });

  it("uploadVehiclePhoto throws when DB insert fails", async () => {
    const selectChain = createPostgrestChain({ data: [], error: null });
    const insertChain = createPostgrestChain({
      data: null,
      error: { message: "insert failed" },
    });
    supabase.from
      .mockImplementationOnce(() => selectChain)
      .mockImplementationOnce(() => insertChain);

    await expect(
      uploadVehiclePhoto({ vehicleId: "v1", fileUri: "file:///a.png" }),
    ).rejects.toEqual(expect.objectContaining({ message: "insert failed" }));
  });

  it("deleteVehiclePhoto maps trigger delete error to actionable message", async () => {
    mockStorageBucket.remove.mockResolvedValue({ error: null });
    supabase.from.mockImplementation(() =>
      createPostgrestChain({
        data: null,
        error: {
          message: "Direct deletion from storage tables is not allowed",
        },
      }),
    );

    await expect(
      deleteVehiclePhoto({
        id: "ph1",
        vehicle_id: "v1",
        storage_bucket: "images",
        storage_path: "v1/x.jpg",
        display_order: 0,
        created_at: "x",
      }),
    ).rejects.toThrow("Photo delete is blocked by backend trigger configuration");
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

  it("reorderVehiclePhotos succeeds when all updates succeed", async () => {
    supabase.from
      .mockImplementationOnce(() => createPostgrestChain({ data: null, error: null }))
      .mockImplementationOnce(() => createPostgrestChain({ data: null, error: null }));
    await expect(reorderVehiclePhotos("v1", ["p1", "p2"])).resolves.toBeUndefined();
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
