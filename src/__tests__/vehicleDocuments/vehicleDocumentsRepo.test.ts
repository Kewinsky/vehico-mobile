jest.mock("../../services/localStorage/localDb", () => ({
  deleteLocalVehicleDocument: jest.fn(),
  getLocalVehicleDocument: jest.fn(),
  insertLocalVehicleDocument: jest.fn(),
  listLocalVehicleDocuments: jest.fn(),
  updateLocalVehicleDocumentDescription: jest.fn(),
}));

jest.mock("../../services/localStorage/localFiles", () => ({
  deleteLocalFile: jest.fn(),
  saveVehicleDocumentFile: jest.fn(),
}));

jest.mock("../../services/storage/uploadUtils", () => ({
  inferContentType: jest.fn(),
  inferExtension: jest.fn(),
  uuid: jest.fn(),
}));

import {
  deleteVehicleDocument,
  listVehicleDocuments,
  updateVehicleDocument,
  uploadVehicleDocument,
} from "../../services/vehicleDocuments/vehicleDocumentsRepo";
import {
  deleteLocalVehicleDocument,
  getLocalVehicleDocument,
  insertLocalVehicleDocument,
  listLocalVehicleDocuments,
  updateLocalVehicleDocumentDescription,
} from "../../services/localStorage/localDb";
import { deleteLocalFile, saveVehicleDocumentFile } from "../../services/localStorage/localFiles";
import { inferContentType, inferExtension, uuid } from "../../services/storage/uploadUtils";

describe("vehicleDocumentsRepo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps local rows in listVehicleDocuments", async () => {
    (listLocalVehicleDocuments as jest.Mock).mockResolvedValue([
      {
        id: "d1",
        vehicle_id: "v1",
        local_path: "/tmp/doc",
        description: "invoice",
        created_at: "2025-01-01",
      },
    ]);

    const out = await listVehicleDocuments("v1");
    expect(out[0]).toEqual(
      expect.objectContaining({
        id: "d1",
        storage_bucket: "documents",
        storage_path: "",
        local_path: "/tmp/doc",
      }),
    );
  });

  it("uploadVehicleDocument stores local file + db row", async () => {
    (inferContentType as jest.Mock).mockReturnValue("application/pdf");
    (inferExtension as jest.Mock).mockReturnValue("pdf");
    (saveVehicleDocumentFile as jest.Mock).mockResolvedValue("/local/doc.pdf");
    (uuid as jest.Mock).mockReturnValue("doc-uuid");

    const out = await uploadVehicleDocument({
      vehicleId: "v1",
      fileUri: "file:///doc",
      fileName: "doc.pdf",
    });

    expect(saveVehicleDocumentFile).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: "v1", ext: "pdf" }),
    );
    expect(insertLocalVehicleDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc-uuid",
        vehicle_id: "v1",
        local_path: "/local/doc.pdf",
        description: null,
      }),
    );
    expect(out.id).toBe("doc-uuid");
  });

  it("updateVehicleDocument throws when doc does not exist", async () => {
    (getLocalVehicleDocument as jest.Mock).mockResolvedValue(null);
    await expect(updateVehicleDocument("missing", "x")).rejects.toThrow(
      "Document not found",
    );
  });

  it("updateVehicleDocument updates description and maps output", async () => {
    (getLocalVehicleDocument as jest.Mock).mockResolvedValue({
      id: "d1",
      vehicle_id: "v1",
      local_path: "/tmp/doc",
      description: null,
      created_at: "2025-01-01",
    });

    const out = await updateVehicleDocument("d1", "new");
    expect(updateLocalVehicleDocumentDescription).toHaveBeenCalledWith("d1", "new");
    expect(out).toEqual(
      expect.objectContaining({
        id: "d1",
        description: "new",
      }),
    );
  });

  it("deleteVehicleDocument removes file when local path exists", async () => {
    await deleteVehicleDocument({
      id: "d1",
      vehicle_id: "v1",
      storage_bucket: "documents",
      storage_path: "",
      description: null,
      created_at: "x",
      local_path: "/tmp/doc",
    });
    expect(deleteLocalFile).toHaveBeenCalledWith("/tmp/doc");
    expect(deleteLocalVehicleDocument).toHaveBeenCalledWith("d1");
  });
});

