jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(),
}));

type DbMock = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

function createDbMock(params: { userVersion: number }): DbMock {
  return {
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes("PRAGMA user_version")) {
        return { user_version: params.userVersion };
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

describe("localDb (SQLite)", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("runs migration when user_version differs, and caches db instance", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 0 });
    SQLite.openDatabaseAsync.mockResolvedValue(db);

    // Use require() (CJS) so we don't need vm-modules for dynamic import.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");

    await mod.insertLocalAttachment({
      id: "a1",
      service_entry_id: "se1",
      type: "receipt",
      local_path: "/tmp/a",
      created_at: "2025-01-01T00:00:00Z",
      display_name: null,
    });

    expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(db.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE local_attachments"),
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("PRAGMA user_version = 1"),
    );

    // second call uses cached instance
    await mod.listLocalAttachments("se1");
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  it("skips migration when user_version matches", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    SQLite.openDatabaseAsync.mockResolvedValue(db);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");
    await mod.listAllLocalAttachmentRows();

    expect(db.execAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("PRAGMA user_version ="),
      expect.anything(),
    );
  });

  it("uses parameter binding for listAllLocalAttachmentsByVehicle", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    db.getAllAsync.mockResolvedValue([{ id: "a1" }]);
    SQLite.openDatabaseAsync.mockResolvedValue(db);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");
    const rows = await mod.listAllLocalAttachmentsByVehicle(["se1", "se2"]);

    expect(rows).toEqual([{ id: "a1" }]);
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("service_entry_id IN (?, ?)"),
      ["se1", "se2"],
    );
  });
});

