/** Rows must include status + created_at; matches DB pick_free_plan_reminder_ids_for_vehicle ordering. */
export type ReminderPickRow = {
  id: string;
  status: string;
  created_at: string;
};

/** Active first, then done; within each group oldest created_at first. */
export function pickFreePlanReminderIds(
  rows: ReminderPickRow[],
  limit: number,
): string[] {
  const sorted = [...rows].sort((a, b) => {
    const da = a.status === "done" ? 1 : 0;
    const db = b.status === "done" ? 1 : 0;
    if (da !== db) return da - db;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  return sorted.slice(0, limit).map((r) => r.id);
}
