function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseYmd(ymd: string, fallback: Date = new Date()): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Use local time to avoid UTC date shifting.
  return new Date(year, month - 1, day);
}
