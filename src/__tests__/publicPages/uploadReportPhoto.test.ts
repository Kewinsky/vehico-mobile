import * as ImageManipulator from "expo-image-manipulator";
import { fetchBlob, randomId } from "../../services/storage/uploadUtils";
import { mockStorageBucket } from "../../test/supabaseMock";
import {
  uploadReportPhoto,
  uploadReportPhotos,
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

  it("uploadReportPhotos uploads all photos preserving display order", async () => {
    const out = await uploadReportPhotos({
      reportId: "rep1",
      photos: [
        { fileUri: "file:///1", displayOrder: 1 },
        { fileUri: "file:///2", displayOrder: 3 },
      ],
    });

    expect(out).toHaveLength(2);
    expect(out.map((p) => p.display_order)).toEqual([1, 3]);
    expect(mockStorageBucket.upload).toHaveBeenCalledTimes(2);
  });
});

