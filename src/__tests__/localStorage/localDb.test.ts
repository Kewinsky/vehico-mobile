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

  it("returns [] for listAllLocalAttachmentsByVehicle when ids empty", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    SQLite.openDatabaseAsync.mockResolvedValue(db);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");

    await expect(mod.listAllLocalAttachmentsByVehicle([])).resolves.toEqual([]);
    expect(db.getAllAsync).not.toHaveBeenCalled();
  });

  it("covers attachment CRUD helpers", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    db.getFirstAsync
      .mockResolvedValueOnce({ user_version: 1 })
      .mockResolvedValueOnce({ id: "a1", service_entry_id: "se1" });
    SQLite.openDatabaseAsync.mockResolvedValue(db);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");

    await mod.updateLocalAttachmentDisplayName("a1", "name");
    await mod.deleteLocalAttachment("a1");
    await expect(mod.getLocalAttachment("a1")).resolves.toEqual(
      expect.objectContaining({ id: "a1" }),
    );

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE local_attachments"),
      { $id: "a1", $display_name: "name" },
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM local_attachments"),
      { $id: "a1" },
    );
  });

  it("covers local vehicle documents CRUD helpers", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    db.getAllAsync.mockResolvedValueOnce([{ id: "d1", vehicle_id: "v1" }]);
    db.getFirstAsync
      .mockResolvedValueOnce({ user_version: 1 })
      .mockResolvedValueOnce({ id: "d1", vehicle_id: "v1" });
    SQLite.openDatabaseAsync.mockResolvedValue(db);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");

    await mod.insertLocalVehicleDocument({
      id: "d1",
      vehicle_id: "v1",
      local_path: "/tmp/d",
      description: null,
      created_at: "2025-01-01",
    });
    await expect(mod.listLocalVehicleDocuments("v1")).resolves.toEqual([
      { id: "d1", vehicle_id: "v1" },
    ]);
    await mod.updateLocalVehicleDocumentDescription("d1", "desc");
    await mod.deleteLocalVehicleDocument("d1");
    await expect(mod.getLocalVehicleDocument("d1")).resolves.toEqual(
      expect.objectContaining({ id: "d1" }),
    );

    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO local_vehicle_documents"),
      expect.objectContaining({ $id: "d1", $vehicle_id: "v1" }),
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE local_vehicle_documents"),
      { $id: "d1", $desc: "desc" },
    );
  });

  it("covers listAllLocalAttachmentRows and listAllLocalVehicleDocumentRows", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SQLite = require("expo-sqlite");
    const db = createDbMock({ userVersion: 1 });
    db.getAllAsync
      .mockResolvedValueOnce([{ id: "a1" }]) // attachments
      .mockResolvedValueOnce([{ id: "d1" }]); // docs
    SQLite.openDatabaseAsync.mockResolvedValue(db);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../../services/localStorage/localDb");

    await expect(mod.listAllLocalAttachmentRows()).resolves.toEqual([{ id: "a1" }]);
    await expect(mod.listAllLocalVehicleDocumentRows()).resolves.toEqual([{ id: "d1" }]);

    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM local_attachments"),
    );
    expect(db.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM local_vehicle_documents"),
    );
  });
});

