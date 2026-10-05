import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  LocalFileNotFoundError,
  openLocalFile,
  openVehicleDocumentFile,
} from "../../services/storage/openLocalFile";
import { mockStorageBucket } from "../../test/supabaseMock";

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("../../services/localStorage/localFiles", () => ({
  toFileUri: (p: string) => (p.startsWith("file://") ? p : `file://${p}`),
}));

describe("openLocalFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      uri: "file:///cache/d1.pdf",
    });
  });

  it("throws LocalFileNotFoundError when file is missing on disk", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    await expect(openLocalFile("/tmp/missing.heic")).rejects.toBeInstanceOf(
      LocalFileNotFoundError,
    );
  });

  it("uses share sheet to open local files", async () => {
    await openLocalFile("/tmp/photo.heic");
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///tmp/photo.heic");
  });

  it("downloads a private cloud document with a short-lived signed URL", async () => {
    await openVehicleDocumentFile({
      id: "d1",
      vehicle_id: "v1",
      storage_bucket: "documents",
      storage_path: "v1/vehicle-documents/d1.pdf",
      description: null,
      created_at: "2026-01-01",
      upload_status: "ready",
    });

    expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
      "v1/vehicle-documents/d1.pdf",
      60,
    );
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      "https://example.test/private-document",
      "file:///cache/d1.pdf",
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/d1.pdf");
  });
});
