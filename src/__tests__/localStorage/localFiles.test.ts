import * as FileSystem from "expo-file-system/legacy";
import { randomId } from "../../services/storage/uploadUtils";
import {
  deleteLocalFile,
  parseVehicleIdFromLocalAttachmentPath,
  saveAttachmentFile,
  saveLocalFile,
  saveVehicleDocumentFile,
  toFileUri,
} from "../../services/localStorage/localFiles";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock("../../services/storage/uploadUtils", () => ({
  randomId: jest.fn(),
}));

describe("localFiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (randomId as jest.Mock).mockReturnValue("rid");
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("saveLocalFile creates dir when missing and copies file", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    const out = await saveLocalFile({
      sourceUri: "file:///src.jpg",
      vehicleId: "v1",
      subDir: "se1",
      ext: "jpg",
    });

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///docs/local_attachments/v1/se1",
      { intermediates: true },
    );
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: "file:///src.jpg",
      to: "file:///docs/local_attachments/v1/se1/1700000000000-rid.jpg",
    });
    expect(out).toBe("file:///docs/local_attachments/v1/se1/1700000000000-rid.jpg");
  });

  it("saveAttachmentFile delegates to saveLocalFile shape", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    await saveAttachmentFile({
      sourceUri: "file:///a",
      vehicleId: "v1",
      serviceEntryId: "se1",
      ext: "pdf",
    });
    expect(FileSystem.copyAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "file:///docs/local_attachments/v1/se1/1700000000000-rid.pdf",
      }),
    );
  });

  it("saveVehicleDocumentFile uses vehicle documents folder", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    const out = await saveVehicleDocumentFile({
      sourceUri: "file:///d",
      vehicleId: "v7",
      ext: "pdf",
    });
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///docs/local_vehicle_documents/v7",
      { intermediates: true },
    );
    expect(out).toBe("file:///docs/local_vehicle_documents/v7/1700000000000-rid.pdf");
  });

  it("deleteLocalFile deletes only when file exists", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
    await deleteLocalFile("/tmp/nope");
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    await deleteLocalFile("/tmp/yes");
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith("/tmp/yes");
  });

  it("toFileUri keeps file:// and adds prefix otherwise", () => {
    expect(toFileUri("file:///tmp/a")).toBe("file:///tmp/a");
    expect(toFileUri("/tmp/a")).toBe("file:///tmp/a");
  });

  it("parseVehicleIdFromLocalAttachmentPath extracts vehicle id", () => {
    expect(
      parseVehicleIdFromLocalAttachmentPath(
        "file:///docs/local_attachments/v1/se1/a.heic",
      ),
    ).toBe("v1");
    expect(parseVehicleIdFromLocalAttachmentPath("/tmp/other")).toBeNull();
  });
});

