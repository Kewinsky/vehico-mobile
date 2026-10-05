/**
 * Cron job: delete vehicles hidden on free plan after 90-day retention.
 * Run daily via Supabase cron or manually with CRON_SECRET.
 *
 * Finds users with plan = 'free', downgraded_at < now() - 90 days,
 * and free_plan_vehicle_id set; deletes their vehicles where id != free_plan_vehicle_id.
 *
 * Before deleting vehicles:
 * - Removes all objects under `images/<vehicle_id>/` (vehicle photos).
 * - Removes all objects under `documents/<vehicle_id>/` (private documents).
 * - For each report of that vehicle, removes all objects under `report-photos/<report_id>/`.
 * - Removes interrupted document uploads after 24 hours.
 *
 * Then deletes vehicle rows – CASCADE removes DB rows (service_entries, reports, photos, …).
 * DB trigger on `photos` may no-op if storage already empty.
 *
 * Local SQLite on user devices is purged when the app next loads the vehicle list
 * (see `purgeOrphanLocalVehicleData` in the mobile app).
 */
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.49.1";

const RETENTION_DAYS = 90;
const PENDING_DOCUMENT_RETENTION_HOURS = 24;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function isStorageFile(entry: {
  metadata?: Record<string, unknown> | null;
}): boolean {
  const m = entry.metadata;
  return m != null && typeof m.size === "number";
}

/** List all entries in one "folder" with pagination. */
async function listPathPage(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  offset: number,
) {
  return admin.storage.from(bucket).list(path, {
    limit: 1000,
    offset,
    sortBy: { column: "name", order: "asc" },
  });
}

/**
 * Recursively delete every file under `path` (path = "" for bucket root folder, or "uuid" for first level).
 */
async function deleteStorageTree(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  errors: string[],
): Promise<number> {
  let removed = 0;
  let offset = 0;
  const directFiles: string[] = [];

  for (;;) {
    const { data: entries, error } = await listPathPage(
      admin,
      bucket,
      path,
      offset,
    );
    if (error) {
      errors.push(`${bucket}/${path || "(root)"}: list: ${error.message}`);
      return removed;
    }
    if (!entries?.length) break;

    for (const entry of entries) {
      const fullPath = path ? `${path}/${entry.name}` : entry.name;
      if (isStorageFile(entry)) {
        directFiles.push(fullPath);
      } else {
        removed += await deleteStorageTree(admin, bucket, fullPath, errors);
      }
    }

    if (entries.length < 1000) break;
    offset += 1000;
  }

  if (directFiles.length > 0) {
    const { error: rmErr } = await admin.storage
      .from(bucket)
      .remove(directFiles);
    if (rmErr) {
      errors.push(`${bucket}/${path || "(root)"}: remove: ${rmErr.message}`);
    } else {
      removed += directFiles.length;
    }
  }

  return removed;
}

async function deleteStorageForVehicles(
  admin: SupabaseClient,
  vehicleIds: string[],
  errors: string[],
): Promise<{
  imagesRemoved: number;
  reportPhotosRemoved: number;
  documentsRemoved: number;
}> {
  let imagesRemoved = 0;
  let reportPhotosRemoved = 0;
  let documentsRemoved = 0;

  for (const vehicleId of vehicleIds) {
    imagesRemoved += await deleteStorageTree(
      admin,
      "images",
      vehicleId,
      errors,
    );
    documentsRemoved += await deleteStorageTree(
      admin,
      "documents",
      vehicleId,
      errors,
    );

    const { data: reports, error: repErr } = await admin
      .from("reports")
      .select("id")
      .eq("vehicle_id", vehicleId);

    if (repErr) {
      errors.push(`vehicle ${vehicleId}: reports select: ${repErr.message}`);
      continue;
    }

    for (const r of reports ?? []) {
      const reportId = r.id as string;
      reportPhotosRemoved += await deleteStorageTree(
        admin,
        "report-photos",
        reportId,
        errors,
      );
    }
  }

  return { imagesRemoved, reportPhotosRemoved, documentsRemoved };
}

async function deleteStalePendingDocuments(
  admin: SupabaseClient,
  errors: string[],
): Promise<number> {
  const cutoff = new Date(
    Date.now() - PENDING_DOCUMENT_RETENTION_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await admin
    .from("vehicle_documents")
    .select("id, storage_path")
    .eq("upload_status", "uploading")
    .lt("created_at", cutoff);
  if (error) {
    errors.push(`stale documents select: ${error.message}`);
    return 0;
  }
  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const { error: storageError } = await admin.storage
    .from("documents")
    .remove(rows.map((row) => row.storage_path as string));
  if (storageError) {
    errors.push(`stale documents storage remove: ${storageError.message}`);
    return 0;
  }
  const { error: deleteError } = await admin
    .from("vehicle_documents")
    .delete()
    .in("id", rows.map((row) => row.id as string));
  if (deleteError) {
    errors.push(`stale documents metadata delete: ${deleteError.message}`);
    return 0;
  }
  return rows.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (cronSecret && bearer !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffIso = cutoff.toISOString();

    const { data: rows, error: selectError } = await admin
      .from("entitlements")
      .select("user_id, free_plan_vehicle_id")
      .eq("plan", "free")
      .not("downgraded_at", "is", null)
      .lt("downgraded_at", cutoffIso)
      .not("free_plan_vehicle_id", "is", null);

    if (selectError) {
      return new Response(
        JSON.stringify({
          error: "entitlements select failed",
          details: selectError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let totalDeleted = 0;
    let storageImagesRemoved = 0;
    let storageReportPhotosRemoved = 0;
    let storageDocumentsRemoved = 0;
    const errors: string[] = [];
    const stalePendingDocumentsDeleted = await deleteStalePendingDocuments(
      admin,
      errors,
    );

    for (const row of rows ?? []) {
      const userId = row.user_id as string;
      const keepVehicleId = row.free_plan_vehicle_id as string;

      const { data: toDelete, error: listError } = await admin
        .from("vehicles")
        .select("id")
        .eq("owner_id", userId)
        .neq("id", keepVehicleId);

      if (listError) {
        errors.push(
          `user ${userId}: list vehicles failed: ${listError.message}`,
        );
        continue;
      }

      const ids = (toDelete ?? []).map((v) => v.id as string);
      if (ids.length === 0) continue;

      const st = await deleteStorageForVehicles(admin, ids, errors);
      storageImagesRemoved += st.imagesRemoved;
      storageReportPhotosRemoved += st.reportPhotosRemoved;
      storageDocumentsRemoved += st.documentsRemoved;

      const { error: deleteError } = await admin
        .from("vehicles")
        .delete()
        .in("id", ids);

      if (deleteError) {
        errors.push(`user ${userId}: delete failed: ${deleteError.message}`);
      } else {
        totalDeleted += ids.length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cutoff: cutoffIso,
        users_processed: (rows ?? []).length,
        vehicles_deleted: totalDeleted,
        storage_images_objects_removed: storageImagesRemoved,
        storage_report_photos_objects_removed: storageReportPhotosRemoved,
        storage_document_objects_removed: storageDocumentsRemoved,
        stale_pending_documents_deleted: stalePendingDocumentsDeleted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
