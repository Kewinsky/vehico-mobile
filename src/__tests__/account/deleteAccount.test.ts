import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteAccount } from "../../services/account/deleteAccount";
import {
  createPostgrestChain,
  mockStorageBucket,
  supabase,
} from "../../test/supabaseMock";

jest.mock("@react-native-async-storage/async-storage", () => ({
  removeItem: jest.fn(),
}));

describe("deleteAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when not authenticated", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    await expect(deleteAccount()).rejects.toThrow("Not authenticated");
  });

  it("deletes account even when user has no vehicles", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    // vehicles list -> []
    const vehiclesSelect = createPostgrestChain({ data: [], error: null });
    // vehicles delete
    const vehiclesDelete = createPostgrestChain({ data: null, error: null });
    // workshops delete
    const workshopsDelete = createPostgrestChain({ data: null, error: null });

    supabase.from
      .mockImplementationOnce(() => vehiclesSelect)
      .mockImplementationOnce(() => vehiclesDelete)
      .mockImplementationOnce(() => workshopsDelete);

    supabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await deleteAccount();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "vehico:user-settings:u1",
    );
    expect(supabase.functions.invoke).toHaveBeenCalledWith("delete-account", {
      method: "POST",
    });
  });

  it("deletes storage for vehicle photos and report temp photos", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    // vehicles list -> [v1]
    const vehiclesSelect = createPostgrestChain({
      data: [{ id: "v1" }],
      error: null,
    });
    // photos list -> two buckets
    const photosSelect = createPostgrestChain({
      data: [
        { storage_bucket: "images", storage_path: "v1/a.jpg" },
        { storage_bucket: "images", storage_path: "v1/b.jpg" },
      ],
      error: null,
    });
    // reports list -> [rep1]
    const reportsSelect = createPostgrestChain({
      data: [{ id: "rep1" }],
      error: null,
    });
    // vehicles delete
    const vehiclesDelete = createPostgrestChain({ data: null, error: null });
    // workshops delete
    const workshopsDelete = createPostgrestChain({ data: null, error: null });

    supabase.from
      .mockImplementationOnce(() => vehiclesSelect)
      .mockImplementationOnce(() => photosSelect)
      .mockImplementationOnce(() => reportsSelect)
      .mockImplementationOnce(() => vehiclesDelete)
      .mockImplementationOnce(() => workshopsDelete);

    // storage: for images remove + report-photos list/remove
    const reportPhotosBucket = {
      ...mockStorageBucket,
      list: jest.fn(async () => ({
        data: [{ name: "x.jpg" }, { name: "" }],
        error: null,
      })),
      remove: jest.fn(async () => ({ error: null })),
    };
    supabase.storage.from.mockImplementation((bucket: string) => {
      if (bucket === "report-photos") return reportPhotosBucket as any;
      return mockStorageBucket as any;
    });
    mockStorageBucket.remove.mockResolvedValue({ error: null });

    supabase.functions.invoke.mockResolvedValue({ data: null, error: null });

    await deleteAccount();

    // vehicle photo storage removed (grouped by bucket)
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([
      "v1/a.jpg",
      "v1/b.jpg",
    ]);

    // report folder list + remove with prefixed paths
    expect(reportPhotosBucket.list).toHaveBeenCalledWith("rep1");
    expect(reportPhotosBucket.remove).toHaveBeenCalledWith(["rep1/x.jpg"]);
  });
});

