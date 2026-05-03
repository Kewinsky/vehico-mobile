/** Rows must include status + created_at (same ordering as client listReminders). */
export type ReminderPickRow = {
  id: string;
  status: string;
  created_at: string;
};

const statusRank = (s: string) => (s === "active" ? 0 : 1);

/** `active` first, then other statuses; within each group oldest `created_at` first; then take first `limit` ids. */
export function pickFreePlanReminderIds(
  rows: ReminderPickRow[],
  limit: number,
): string[] {
  const sorted = [...rows].sort((a, b) => {
    const ra = statusRank(a.status);
    const rb = statusRank(b.status);
    if (ra !== rb) return ra - rb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  return sorted.slice(0, limit).map((r) => r.id);
}
