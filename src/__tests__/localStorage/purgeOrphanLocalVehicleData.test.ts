import { supabase } from "../../test/supabaseMock";
import { purgeOrphanLocalVehicleData } from "../../services/localStorage/purgeOrphanLocalVehicleData";
import * as FileSystem from "expo-file-system/legacy";
import {
  deleteLocalAttachment,
  deleteLocalVehicleDocument,
  listAllLocalAttachmentRows,
  listAllLocalVehicleDocumentRows,
} from "../../services/localStorage/localDb";
import { deleteLocalFile } from "../../services/localStorage/localFiles";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  getInfoAsync: jest.fn(async () => ({ exists: false, isDirectory: false })),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => {}),
}));

jest.mock("../../services/localStorage/localDb", () => ({
  listAllLocalAttachmentRows: jest.fn(),
  listAllLocalVehicleDocumentRows: jest.fn(),
  deleteLocalAttachment: jest.fn(),
  deleteLocalVehicleDocument: jest.fn(),
}));

jest.mock("../../services/localStorage/localFiles", () => ({
  deleteLocalFile: jest.fn(),
  parseVehicleIdFromLocalAttachmentPath: (localPath: string) => {
    const match = localPath.match(/local_attachments\/([^/]+)\//);
    return match?.[1] ?? null;
  },
}));

describe("purgeOrphanLocalVehicleData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes all local rows when there are no valid vehicles", async () => {
    (listAllLocalAttachmentRows as any).mockResolvedValue([
      {
        id: "a1",
        service_entry_id: "se1",
        local_path: "file:///docs/local_attachments/v1/se1/a1",
      },
    ]);
    (listAllLocalVehicleDocumentRows as any).mockResolvedValue([
      { id: "d1", vehicle_id: "v1", local_path: "/x/d1" },
    ]);

    await purgeOrphanLocalVehicleData([]);

    expect(deleteLocalFile).toHaveBeenCalledWith(
      "file:///docs/local_attachments/v1/se1/a1",
    );
    expect(deleteLocalAttachment).toHaveBeenCalledWith("a1");
    expect(deleteLocalFile).toHaveBeenCalledWith("/x/d1");
    expect(deleteLocalVehicleDocument).toHaveBeenCalledWith("d1");
    // No server fetch on empty list
    expect(supabase.from).not.toHaveBeenCalledWith("service_entries");
  });

  it("fetches service entry ids and keeps matching attachment rows", async () => {
    (listAllLocalAttachmentRows as any).mockResolvedValue([
      {
        id: "a1",
        service_entry_id: "se-keep",
        local_path: "file:///docs/local_attachments/v1/se-keep/a1",
      },
      {
        id: "a2",
        service_entry_id: "se-drop",
        local_path: "file:///docs/local_attachments/v1/se-drop/a2",
      },
    ]);
    (listAllLocalVehicleDocumentRows as any).mockResolvedValue([]);

    const rangeMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }).map(() => ({ id: "se-keep" })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: "se-keep" }], error: null });
    supabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          range: rangeMock,
        })),
      })),
    }));

    await purgeOrphanLocalVehicleData(["v1"]);

    expect(rangeMock).toHaveBeenCalledWith(0, 999);
    expect(rangeMock).toHaveBeenCalledWith(1000, 1999);
    expect(deleteLocalAttachment).toHaveBeenCalledWith("a2");
    expect(deleteLocalAttachment).not.toHaveBeenCalledWith("a1");
  });

  it("does not purge attachments when server returns zero service entries but local files exist", async () => {
    (listAllLocalAttachmentRows as any).mockResolvedValue([
      {
        id: "a1",
        service_entry_id: "se-local",
        local_path: "file:///docs/local_attachments/v1/se-local/a.heic",
      },
    ]);
    (listAllLocalVehicleDocumentRows as any).mockResolvedValue([]);
    supabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          range: jest.fn(async () => ({ data: [], error: null })),
        })),
      })),
    }));

    await purgeOrphanLocalVehicleData(["v1"]);

    expect(deleteLocalFile).not.toHaveBeenCalled();
    expect(deleteLocalAttachment).not.toHaveBeenCalled();
  });

  it("removes orphan local folders for invalid vehicle ids", async () => {
    (listAllLocalAttachmentRows as any).mockResolvedValue([]);
    (listAllLocalVehicleDocumentRows as any).mockResolvedValue([]);
    supabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          range: jest.fn(async () => ({ data: [], error: null })),
        })),
      })),
    }));
    (FileSystem.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: true, isDirectory: true }) // local_attachments
      .mockResolvedValueOnce({ exists: true, isDirectory: true }); // local_vehicle_documents
    (FileSystem.readDirectoryAsync as jest.Mock)
      .mockResolvedValueOnce(["v-keep", "v-drop-a"])
      .mockResolvedValueOnce(["v-drop-b"]);

    await purgeOrphanLocalVehicleData(["v-keep"]);

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///docs/local_attachments/v-drop-a",
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///docs/local_vehicle_documents/v-drop-b",
      { idempotent: true },
    );
  });

});

