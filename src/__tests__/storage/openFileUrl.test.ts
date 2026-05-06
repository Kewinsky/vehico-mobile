jest.mock("../../services/localStorage/localFiles", () => ({
  toFileUri: jest.fn((p: string) => `file://${p}`),
}));

import {
  getAttachmentOpenUrl,
  getFileNameFromItem,
  getVehicleDocumentOpenUrl,
} from "../../services/storage/openFileUrl";
import { toFileUri } from "../../services/localStorage/localFiles";

describe("openFileUrl", () => {
  it("returns open URL for attachment local path", () => {
    const out = getAttachmentOpenUrl({ local_path: "/tmp/a.pdf" });
    expect(toFileUri).toHaveBeenCalledWith("/tmp/a.pdf");
    expect(out).toBe("file:///tmp/a.pdf");
  });

  it("throws when attachment has no local file", () => {
    expect(() => getAttachmentOpenUrl({})).toThrow("Attachment has no local file");
  });

  it("returns open URL for vehicle document local path", () => {
    const out = getVehicleDocumentOpenUrl({ local_path: "/tmp/d.pdf" });
    expect(toFileUri).toHaveBeenCalledWith("/tmp/d.pdf");
    expect(out).toBe("file:///tmp/d.pdf");
  });

  it("throws when vehicle document has no local file", () => {
    expect(() => getVehicleDocumentOpenUrl({})).toThrow("Document has no local file");
  });

  it("extracts filename from local_path first, then storage_path", () => {
    expect(getFileNameFromItem({ local_path: "/a/b/c.txt" })).toBe("c.txt");
    expect(getFileNameFromItem({ storage_path: "x/y/z.jpg" })).toBe("z.jpg");
    expect(getFileNameFromItem({})).toBe("");
  });
});

