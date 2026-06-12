import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

import {
  LocalFileNotFoundError,
  openLocalFile,
} from "../../services/storage/openLocalFile";

jest.mock("expo-file-system/legacy", () => ({
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
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throws LocalFileNotFoundError when file is missing on disk", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    await expect(openLocalFile("/tmp/missing.heic")).rejects.toBeInstanceOf(
      LocalFileNotFoundError,
    );
  });

  it("uses share sheet on iOS", async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "ios" });
    await openLocalFile("/tmp/photo.heic");
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///tmp/photo.heic");
    Object.defineProperty(Platform, "OS", { value: original });
  });

  it("uses Linking on Android when available", async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "android" });
    await openLocalFile("/tmp/doc.pdf");
    expect(Linking.openURL).toHaveBeenCalledWith("file:///tmp/doc.pdf");
    Object.defineProperty(Platform, "OS", { value: original });
  });
});
