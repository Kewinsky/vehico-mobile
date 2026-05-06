jest.mock("../../services/localStorage/localDb", () => ({
  deleteLocalAttachment: jest.fn(),
  insertLocalAttachment: jest.fn(),
  listLocalAttachments: jest.fn(),
  listAllLocalAttachmentsByVehicle: jest.fn(),
  updateLocalAttachmentDisplayName: jest.fn(),
}));

jest.mock("../../services/localStorage/localFiles", () => ({
  deleteLocalFile: jest.fn(),
  saveAttachmentFile: jest.fn(),
}));

jest.mock("../../services/storage/uploadUtils", () => ({
  inferContentType: jest.fn(),
  inferExtension: jest.fn(),
  uuid: jest.fn(),
}));

jest.mock("../../services/serviceEntries/serviceEntriesRepo", () => ({
  listServiceEntries: jest.fn(),
}));

import {
  deleteAttachment,
  listAttachments,
  listVehicleAttachments,
  updateAttachmentDisplayName,
  uploadAttachment,
} from "../../services/attachments/attachmentsRepo";
import {
  deleteLocalAttachment,
  insertLocalAttachment,
  listAllLocalAttachmentsByVehicle,
  listLocalAttachments,
  updateLocalAttachmentDisplayName,
} from "../../services/localStorage/localDb";
import { deleteLocalFile, saveAttachmentFile } from "../../services/localStorage/localFiles";
import { inferContentType, inferExtension, uuid } from "../../services/storage/uploadUtils";
import { listServiceEntries } from "../../services/serviceEntries/serviceEntriesRepo";

describe("attachmentsRepo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps local rows in listAttachments", async () => {
    (listLocalAttachments as jest.Mock).mockResolvedValue([
      {
        id: "a1",
        service_entry_id: "se1",
        type: "receipt",
        local_path: "/tmp/f",
        created_at: "2025-01-01T00:00:00Z",
        display_name: null,
      },
    ]);

    const out = await listAttachments("se1");
    expect(out).toEqual([
      expect.objectContaining({
        id: "a1",
        service_entry_id: "se1",
        storage_bucket: "documents",
        storage_path: "",
        display_name: undefined,
      }),
    ]);
  });

  it("uploadAttachment stores local file + db row with inferred metadata", async () => {
    (inferContentType as jest.Mock).mockReturnValue("image/jpeg");
    (inferExtension as jest.Mock).mockReturnValue("jpg");
    (saveAttachmentFile as jest.Mock).mockResolvedValue("/local/a.jpg");
    (uuid as jest.Mock).mockReturnValue("uuid-1");

    const out = await uploadAttachment({
      serviceEntryId: "se1",
      vehicleId: "v1",
      fileUri: "file:///a",
      fileName: "  faktura.jpg ",
    });

    expect(saveAttachmentFile).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: "v1", serviceEntryId: "se1", ext: "jpg" }),
    );
    expect(insertLocalAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "uuid-1",
        service_entry_id: "se1",
        type: "photo",
        local_path: "/local/a.jpg",
        display_name: "faktura.jpg",
      }),
    );
    expect(out.type).toBe("photo");
    expect(out.local_path).toBe("/local/a.jpg");
  });

  it("updateAttachmentDisplayName trims and persists null for blank", async () => {
    await updateAttachmentDisplayName("a1", "  ");
    expect(updateLocalAttachmentDisplayName).toHaveBeenCalledWith("a1", null);
  });

  it("deleteAttachment removes file when local_path exists", async () => {
    await deleteAttachment({
      id: "a1",
      service_entry_id: "se1",
      type: "receipt",
      storage_bucket: "documents",
      storage_path: "",
      created_at: "x",
      local_path: "/tmp/1",
    });
    expect(deleteLocalFile).toHaveBeenCalledWith("/tmp/1");
    expect(deleteLocalAttachment).toHaveBeenCalledWith("a1");
  });

  it("listVehicleAttachments enriches with serviceEntryTitle", async () => {
    (listServiceEntries as jest.Mock).mockResolvedValue([
      { id: "se1", title: "Oil change" },
      { id: "se2", title: "Brakes" },
    ]);
    (listAllLocalAttachmentsByVehicle as jest.Mock).mockResolvedValue([
      {
        id: "a1",
        service_entry_id: "se2",
        type: "photo",
        local_path: "/tmp/p",
        created_at: "2025-01-01",
        display_name: "img",
      },
    ]);

    const out = await listVehicleAttachments("v1");
    expect(listAllLocalAttachmentsByVehicle).toHaveBeenCalledWith(["se1", "se2"]);
    expect(out[0]).toEqual(
      expect.objectContaining({
        id: "a1",
        serviceEntryTitle: "Brakes",
      }),
    );
  });
});

