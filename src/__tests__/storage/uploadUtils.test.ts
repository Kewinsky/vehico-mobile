import {
  inferContentType,
  inferExtension,
} from "../../services/storage/uploadUtils";

describe("inferContentType", () => {
  it("prefers explicit mimeType", () => {
    expect(
      inferContentType({
        uri: "file:///x.bin",
        mimeType: "image/png",
      }),
    ).toBe("image/png");
  });

  it("infers from fileName extension", () => {
    expect(inferContentType({ uri: "file:///x", fileName: "Doc.PDF" })).toBe(
      "application/pdf",
    );
  });

  it("infers from uri when no fileName", () => {
    expect(inferContentType({ uri: "file:///photo.JPEG" })).toBe("image/jpeg");
  });
});

describe("inferExtension", () => {
  it("uses file extension when present", () => {
    expect(
      inferExtension({
        uri: "file:///x",
        contentType: "application/octet-stream",
        fileName: "a.webp",
      }),
    ).toBe("webp");
  });

  it("falls back to contentType mapping", () => {
    expect(
      inferExtension({
        uri: "file:///noext",
        contentType: "image/png",
      }),
    ).toBe("png");
  });
});
