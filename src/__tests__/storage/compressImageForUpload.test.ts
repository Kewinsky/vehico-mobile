import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import {
  compressImageForUpload,
  UPLOAD_IMAGE_JPEG_QUALITY,
  UPLOAD_IMAGE_MAX_EDGE,
} from "../../services/storage/compressImageForUpload";

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

describe("compressImageForUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///out.jpg",
      width: 1600,
      height: 1200,
    });
  });

  it("resizes landscape images wider than max edge", async () => {
    jest.spyOn(Image, "getSize").mockImplementation((_uri, success) => {
      success(4000, 3000);
    });

    await expect(compressImageForUpload("file:///big.jpg")).resolves.toBe(
      "file:///out.jpg",
    );

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///big.jpg",
      [{ resize: { width: UPLOAD_IMAGE_MAX_EDGE } }],
      {
        compress: UPLOAD_IMAGE_JPEG_QUALITY,
        format: "jpeg",
      },
    );
  });

  it("resizes portrait images taller than max edge", async () => {
    jest.spyOn(Image, "getSize").mockImplementation((_uri, success) => {
      success(2000, 4000);
    });

    await compressImageForUpload("file:///tall.jpg");

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tall.jpg",
      [{ resize: { height: UPLOAD_IMAGE_MAX_EDGE } }],
      expect.any(Object),
    );
  });

  it("skips resize when already within max edge", async () => {
    jest.spyOn(Image, "getSize").mockImplementation((_uri, success) => {
      success(800, 600);
    });

    await compressImageForUpload("file:///small.jpg");

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///small.jpg",
      [],
      expect.objectContaining({ compress: UPLOAD_IMAGE_JPEG_QUALITY }),
    );
  });

  it("still converts when getSize fails", async () => {
    jest.spyOn(Image, "getSize").mockImplementation((_uri, _ok, fail) => {
      fail?.(new Error("boom"));
    });

    await compressImageForUpload("file:///unknown.jpg");

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///unknown.jpg",
      [],
      expect.any(Object),
    );
  });
});
