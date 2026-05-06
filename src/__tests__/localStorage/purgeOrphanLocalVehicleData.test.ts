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
}));

import { supabase } from "../../test/supabaseMock";
import { purgeOrphanLocalVehicleData } from "../../services/localStorage/purgeOrphanLocalVehicleData";
import {
  deleteLocalAttachment,
  deleteLocalVehicleDocument,
  listAllLocalAttachmentRows,
  listAllLocalVehicleDocumentRows,
} from "../../services/localStorage/localDb";
import { deleteLocalFile } from "../../services/localStorage/localFiles";

describe("purgeOrphanLocalVehicleData", () => {
  it("deletes all local rows when there are no valid vehicles", async () => {
    (listAllLocalAttachmentRows as any).mockResolvedValue([
      { id: "a1", service_entry_id: "se1", local_path: "/x/a1" },
    ]);
    (listAllLocalVehicleDocumentRows as any).mockResolvedValue([
      { id: "d1", vehicle_id: "v1", local_path: "/x/d1" },
    ]);

    await purgeOrphanLocalVehicleData([]);

    expect(deleteLocalFile).toHaveBeenCalledWith("/x/a1");
    expect(deleteLocalAttachment).toHaveBeenCalledWith("a1");
    expect(deleteLocalFile).toHaveBeenCalledWith("/x/d1");
    expect(deleteLocalVehicleDocument).toHaveBeenCalledWith("d1");
    // No server fetch on empty list
    expect(supabase.from).not.toHaveBeenCalledWith("service_entries");
  });
});

