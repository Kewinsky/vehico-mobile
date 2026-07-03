/** Days between a YYYY-MM-DD and today (local dates). */
export function daysSinceYmd(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return Number.POSITIVE_INFINITY;
  const from = new Date(+m[1], +m[2] - 1, +m[3]);
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Copy for stale-mileage card: 1–11 → "N months ago", 12+ → "over a year ago".
 * Expects YYYY-MM-DD (`mileage_updated_at`). Rough months = floor(days / 30).
 */
export function formatRelativeTimePast(ymd: string, locale: string): string {
  const months = Math.floor(daysSinceYmd(ymd) / 30);
  const pl = locale.toLowerCase().startsWith("pl");

  if (months >= 12) {
    return pl ? "ponad rok temu" : "over a year ago";
  }

  const n = Math.max(1, months);
  if (pl) {
    if (n === 1) return "miesiąc temu";
    if (n <= 4) return `${n} miesiące temu`;
    return `${n} miesięcy temu`;
  }
  return n === 1 ? "a month ago" : `${n} months ago`;
}
