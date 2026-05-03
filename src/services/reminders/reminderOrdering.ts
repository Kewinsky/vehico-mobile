/** `active` first, then any other status; within each group oldest `created_at` first. */
export function sortRemindersActiveFirstByCreatedAt<
  T extends { status: string; created_at: string },
>(rows: T[]): T[] {
  const statusRank = (s: string) => (s === "active" ? 0 : 1);
  return [...rows].sort((a, b) => {
    const ra = statusRank(a.status);
    const rb = statusRank(b.status);
    if (ra !== rb) return ra - rb;
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}
