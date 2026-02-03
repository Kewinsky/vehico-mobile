import { supabase } from "../supabase/client";

const REPORT_PHOTOS_BUCKET = "report-photos";

/**
 * Deletes all data and storage for the current user, then deletes the auth account.
 * Order: 1) report-photos storage per report, 2) vehicles (cascade: reports, service_entries, photos→images, fueling_entries, reminders, posts, tires, wheels, attachments), 3) workshops, 4) user_settings, 5) auth.deleteUser().
 */
export async function deleteAccount(): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const uid = user.id;

  // 1) Get vehicle IDs for this user, then report IDs (reports → vehicles.owner_id)
  const { data: vehicleIds } = await supabase
    .from("vehicles")
    .select("id")
    .eq("owner_id", uid);
  const vids = (vehicleIds ?? []).map((r) => r.id);
  if (vids.length === 0) {
    // No vehicles — still delete workshops, user_settings, auth
  } else {
    const { data: reportRows, error: reportRowsError } = await supabase
      .from("reports")
      .select("id")
      .in("vehicle_id", vids);
    if (reportRowsError) throw reportRowsError;
    const reportIds = (reportRows ?? []).map((r) => r.id);

    // 2) Delete report-photos storage for each report (path: report_id/filename)
    for (const reportId of reportIds) {
      const { data: files, error: listError } = await supabase.storage
        .from(REPORT_PHOTOS_BUCKET)
        .list(reportId);
      if (listError) {
        // Folder may not exist or be empty
        continue;
      }
      const pathsToRemove = (files ?? [])
        .filter((f) => f.name)
        .map((f) => `${reportId}/${f.name}`);
      if (pathsToRemove.length > 0) {
        await supabase.storage.from(REPORT_PHOTOS_BUCKET).remove(pathsToRemove);
      }
    }
  }

  // 3) Delete vehicles (cascade: reports, service_entries, photos [trigger→images], fueling_entries, reminders, posts, tires, wheels, attachments)
  const { error: vehiclesError } = await supabase
    .from("vehicles")
    .delete()
    .eq("owner_id", uid);
  if (vehiclesError) throw vehiclesError;

  // 4) Delete workshops
  const { error: workshopsError } = await supabase
    .from("workshops")
    .delete()
    .eq("owner_id", uid);
  if (workshopsError) throw workshopsError;

  // 5) Delete user_settings
  const { error: settingsError } = await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", uid);
  if (settingsError) throw settingsError;

  // 6) Delete auth user via Edge Function (client has no deleteUser(); admin API requires service_role)
  const { error: deleteUserError } = await supabase.functions.invoke(
    "delete-account",
    { method: "POST" }
  );
  if (deleteUserError) throw deleteUserError;
}
