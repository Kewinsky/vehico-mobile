import * as SQLite from "expo-sqlite";

const DB_NAME = "vehico-local.db";
const DATABASE_VERSION = 1;

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrateIfNeeded(db);
  dbInstance = db;
  return db;
}

async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const { user_version: currentVersion } = (await db.getFirstAsync(
    "PRAGMA user_version",
  )) as { user_version: number };

  if (currentVersion === DATABASE_VERSION) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    DROP TABLE IF EXISTS local_attachments;
    DROP TABLE IF EXISTS local_vehicle_documents;

    CREATE TABLE local_attachments (
      id TEXT PRIMARY KEY NOT NULL,
      service_entry_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('receipt', 'invoice', 'photo')),
      local_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      display_name TEXT
    );
    CREATE INDEX idx_local_attachments_service_entry
      ON local_attachments(service_entry_id);
    CREATE INDEX idx_local_attachments_created
      ON local_attachments(created_at DESC);

    CREATE TABLE local_vehicle_documents (
      id TEXT PRIMARY KEY NOT NULL,
      vehicle_id TEXT NOT NULL,
      local_path TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_local_vehicle_documents_vehicle
      ON local_vehicle_documents(vehicle_id);
    CREATE INDEX idx_local_vehicle_documents_created
      ON local_vehicle_documents(created_at DESC);
  `);
  await db.runAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// --- Local Attachments ---

export type LocalAttachmentRow = {
  id: string;
  service_entry_id: string;
  type: "receipt" | "invoice" | "photo";
  local_path: string;
  created_at: string;
  display_name?: string | null;
};

export async function insertLocalAttachment(
  row: LocalAttachmentRow,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO local_attachments (id, service_entry_id, type, local_path, created_at, display_name)
     VALUES ($id, $service_entry_id, $type, $local_path, $created_at, $display_name)`,
    {
      $id: row.id,
      $service_entry_id: row.service_entry_id,
      $type: row.type,
      $local_path: row.local_path,
      $created_at: row.created_at,
      $display_name: row.display_name ?? null,
    },
  );
}

export async function listLocalAttachments(
  serviceEntryId: string,
): Promise<LocalAttachmentRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalAttachmentRow>(
    `SELECT * FROM local_attachments WHERE service_entry_id = $id ORDER BY created_at DESC`,
    { $id: serviceEntryId },
  );
  return rows;
}

export async function listAllLocalAttachmentsByVehicle(
  serviceEntryIds: string[],
): Promise<LocalAttachmentRow[]> {
  if (serviceEntryIds.length === 0) return [];
  const db = await getDb();
  const placeholders = serviceEntryIds.map(() => "?").join(", ");
  const rows = await db.getAllAsync<LocalAttachmentRow>(
    `SELECT * FROM local_attachments WHERE service_entry_id IN (${placeholders}) ORDER BY created_at DESC`,
    serviceEntryIds as unknown as SQLite.SQLiteBindValue[],
  );
  return rows;
}

/** All attachment rows (for orphan purge vs server). */
export async function listAllLocalAttachmentRows(): Promise<LocalAttachmentRow[]> {
  const db = await getDb();
  return db.getAllAsync<LocalAttachmentRow>(
    `SELECT * FROM local_attachments ORDER BY created_at DESC`,
  );
}

export async function updateLocalAttachmentDisplayName(
  id: string,
  displayName: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE local_attachments SET display_name = $display_name WHERE id = $id`,
    { $id: id, $display_name: displayName },
  );
}

export async function deleteLocalAttachment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM local_attachments WHERE id = $id`, {
    $id: id,
  });
}

export async function getLocalAttachment(
  id: string,
): Promise<LocalAttachmentRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LocalAttachmentRow>(
    `SELECT * FROM local_attachments WHERE id = $id`,
    { $id: id },
  );
  return row ?? null;
}

// --- Local Vehicle Documents ---

export type LocalVehicleDocumentRow = {
  id: string;
  vehicle_id: string;
  local_path: string;
  description: string | null;
  created_at: string;
};

export async function insertLocalVehicleDocument(
  row: LocalVehicleDocumentRow,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO local_vehicle_documents (id, vehicle_id, local_path, description, created_at)
     VALUES ($id, $vehicle_id, $local_path, $description, $created_at)`,
    {
      $id: row.id,
      $vehicle_id: row.vehicle_id,
      $local_path: row.local_path,
      $description: row.description,
      $created_at: row.created_at,
    },
  );
}

export async function listLocalVehicleDocuments(
  vehicleId: string,
): Promise<LocalVehicleDocumentRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalVehicleDocumentRow>(
    `SELECT * FROM local_vehicle_documents WHERE vehicle_id = $id ORDER BY created_at DESC`,
    { $id: vehicleId },
  );
  return rows;
}

/** All local vehicle document rows (for orphan purge vs server). */
export async function listAllLocalVehicleDocumentRows(): Promise<
  LocalVehicleDocumentRow[]
> {
  const db = await getDb();
  return db.getAllAsync<LocalVehicleDocumentRow>(
    `SELECT * FROM local_vehicle_documents ORDER BY created_at DESC`,
  );
}

export async function updateLocalVehicleDocumentDescription(
  id: string,
  description: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE local_vehicle_documents SET description = $desc WHERE id = $id`,
    { $id: id, $desc: description },
  );
}

export async function deleteLocalVehicleDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM local_vehicle_documents WHERE id = $id`, {
    $id: id,
  });
}

export async function getLocalVehicleDocument(
  id: string,
): Promise<LocalVehicleDocumentRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LocalVehicleDocumentRow>(
    `SELECT * FROM local_vehicle_documents WHERE id = $id`,
    { $id: id },
  );
  return row ?? null;
}
