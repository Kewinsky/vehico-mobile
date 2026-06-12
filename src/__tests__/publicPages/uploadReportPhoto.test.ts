import * as ImageManipulator from "expo-image-manipulator";
import { fetchBlob, randomId } from "../../services/storage/uploadUtils";
import { mockStorageBucket, supabase } from "../../test/supabaseMock";
import {
  copyVehiclePhotoToReport,
  uploadAllReportPhotos,
  uploadReportPhoto,
} from "../../services/publicPages/uploadReportPhoto";

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("../../services/storage/uploadUtils", () => ({
  fetchBlob: jest.fn(),
  randomId: jest.fn(),
}));

describe("uploadReportPhoto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(supabase.storage.from).mockImplementation(
      () => mockStorageBucket as any,
    );
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    (randomId as jest.Mock).mockReturnValue("rid");
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///converted.jpg",
    });
    (fetchBlob as jest.Mock).mockResolvedValue("blob-data");
    mockStorageBucket.upload.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("converts image to JPEG and uploads to report-photos bucket", async () => {
    const out = await uploadReportPhoto({
      reportId: "rep1",
      fileUri: "file:///orig.png",
      displayOrder: 2,
    });

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///orig.png",
      [],
      { compress: 0.9, format: "jpeg" },
    );
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      "rep1/1700000000000-rid.jpg",
      "blob-data",
      { contentType: "image/jpeg", upsert: false },
    );
    expect(out).toEqual({
      storage_path: "rep1/1700000000000-rid.jpg",
      display_order: 2,
    });
  });

  it("maps bucket-missing error to friendly message", async () => {
    mockStorageBucket.upload.mockResolvedValue({
      error: { message: "bucket not found" },
    });

    await expect(
      uploadReportPhoto({
        reportId: "rep1",
        fileUri: "file:///orig.png",
        displayOrder: 0,
      }),
    ).rejects.toThrow('Storage bucket "report-photos" not found');
  });

  it("rethrows non-bucket upload errors", async () => {
    mockStorageBucket.upload.mockResolvedValue({
      error: { message: "permission denied" },
    });

    await expect(
      uploadReportPhoto({
        reportId: "rep1",
        fileUri: "file:///orig.png",
        displayOrder: 0,
      }),
    ).rejects.toEqual(expect.objectContaining({ message: "permission denied" }));
  });

  it("copyVehiclePhotoToReport fetches public image url and uploads ArrayBuffer", async () => {
    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.test/v1/photo.jpg" },
    });
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    (fetchBlob as jest.Mock).mockResolvedValueOnce(buffer);

    const out = await copyVehiclePhotoToReport({
      reportId: "rep1",
      photo: { storage_bucket: "images", storage_path: "v1/photo.jpg" },
      displayOrder: 0,
    });

    expect(mockStorageBucket.getPublicUrl).toHaveBeenCalledWith("v1/photo.jpg");
    expect(fetchBlob).toHaveBeenCalledWith("https://cdn.test/v1/photo.jpg");
    expect(mockStorageBucket.upload).toHaveBeenCalledWith(
      "rep1/1700000000000-rid.jpg",
      buffer,
      { contentType: "image/jpeg", upsert: false },
    );
    expect(out.storage_path).toBe("rep1/1700000000000-rid.jpg");
  });

  it("uploadAllReportPhotos copies vehicle photos and uploads local photos", async () => {
    mockStorageBucket.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.test/v1/a.jpg" },
    });
    (fetchBlob as jest.Mock)
      .mockResolvedValueOnce(new Uint8Array([1]).buffer)
      .mockResolvedValueOnce("blob-data");

    const out = await uploadAllReportPhotos({
      reportId: "rep1",
      items: [
        {
          kind: "vehicle",
          vehiclePhoto: {
            id: "p1",
            vehicle_id: "v1",
            storage_bucket: "images",
            storage_path: "v1/a.jpg",
            display_order: 0,
            created_at: "2025-01-01",
          },
          displayOrder: 0,
        },
        {
          kind: "local",
          fileUri: "file:///2",
          displayOrder: 1,
        },
      ],
    });

    expect(out).toHaveLength(2);
    expect(fetchBlob).toHaveBeenCalledWith("https://cdn.test/v1/a.jpg");
    expect(mockStorageBucket.upload).toHaveBeenCalledTimes(2);
  });

});

