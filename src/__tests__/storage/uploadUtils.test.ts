jest.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: "base64" },
}));

import {
  fetchBlob,
  inferContentType,
  inferExtension,
  randomId,
  uuid,
} from "../../services/storage/uploadUtils";
import * as FileSystem from "expo-file-system/legacy";

describe("ids", () => {
  it("randomId returns non-empty string", () => {
    expect(randomId()).toEqual(expect.any(String));
    expect(randomId().length).toBeGreaterThan(5);
  });

  it("uuid returns v4-like format", () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("fetchBlob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads local file as base64 and returns ArrayBuffer", async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue("AQ=="); // 0x01
    const atobSpy = jest
      .spyOn(globalThis, "atob")
      .mockImplementation(() => String.fromCharCode(1));

    const out = await fetchBlob("file:///x.jpg");
    expect(out).toBeInstanceOf(ArrayBuffer);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith("file:///x.jpg", {
      encoding: "base64",
    });
    atobSpy.mockRestore();
  });

  it("falls back to fetch() for remote url", async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
      new Error("local read fail"),
    );
    const blob = new Blob(["abc"]);
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, blob: async () => blob } as Response);

    await expect(fetchBlob("https://example.com/x.jpg")).resolves.toBe(blob);
    fetchMock.mockRestore();
  });

  it("throws descriptive error for failed remote fetch", async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
      new Error("local read fail"),
    );
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: false, status: 500 } as Response);

    await expect(fetchBlob("http://example.com/fail")).rejects.toThrow(
      "Failed to read file for upload (HTTP 500)",
    );
    fetchMock.mockRestore();
  });

  it("throws local read error for non-http uri", async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
      new Error("boom"),
    );
    await expect(fetchBlob("file:///nope")).rejects.toThrow(
      "Failed to read file: boom",
    );
  });
});

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
