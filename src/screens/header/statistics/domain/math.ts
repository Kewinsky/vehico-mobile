import { groupThousands } from "../../../../utils/numberFormatting";

export function monthKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthKeyFromYyyyMm(yyyyMm: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12)
    return null;
  return new Date(year, month - 1, 1);
}

export function listMonthKeysInclusive(
  startYyyyMm: string,
  endYyyyMm: string,
): string[] {
  const start = monthKeyFromYyyyMm(startYyyyMm);
  const end = monthKeyFromYyyyMm(endYyyyMm);
  if (!start || !end) return [];
  if (start > end) return [];
  const out: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    out.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export function parseDateLoose(input: string): Date | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function clampNonNeg(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function fmtMoney(amount: number, currency: string): string {
  const value = clampNonNeg(amount);
  return `${value.toFixed(0)} ${currency}`;
}

export function niceMaxValue(max: number): number {
  if (max <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

function roundToNice(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let niceNormalized: number;
  if (normalized <= 1.5) niceNormalized = 1;
  else if (normalized <= 3.5) niceNormalized = 2;
  else if (normalized <= 7.5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

export function generateNiceTicks(max: number): number[] {
  const niceMax = niceMaxValue(max);
  const ticks: number[] = [0];
  const targetTicks = 5;
  const rawStep = niceMax / targetTicks;
  const niceStep = roundToNice(rawStep);
  for (let i = niceStep; i <= niceMax; i += niceStep) ticks.push(i);
  if (ticks.length < 4) {
    const smallerStep = niceStep / 2;
    ticks.length = 1;
    for (let i = smallerStep; i <= niceMax; i += smallerStep) ticks.push(i);
  }
  return ticks;
}

export function fmtPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return `${Math.round(pct)}%`;
}

export function fmtNumber(
  amount: number,
  digits = 1,
  language?: string | null,
): string {
  if (!Number.isFinite(amount)) return "—";
  return groupThousands(amount, digits, language);
}

export function fmtMonths(
  value: number,
  language?: string | null,
): string {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value)
    ? groupThousands(value, 0, language)
    : groupThousands(value, 1, language);
}

export function fmtChartNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return Math.round(value).toString();
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}

export function formatChartYAxisLabel(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) {
    const inThousands = value / 1000;
    return Number.isInteger(inThousands)
      ? `${inThousands}k`
      : `${inThousands.toFixed(1)}k`;
  }
  if (Number.isInteger(value)) return Math.round(value).toString();
  return value >= 10 ? Math.round(value).toString() : value.toFixed(1);
}

export function formatChartMonthKey(key: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return key.replace("-", "/");
  const month = parseInt(match[2], 10) - 1;
  const short = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(2000, month, 1),
  );
  const withDot = short.endsWith(".") ? short : `${short}.`;
  return withDot.charAt(0).toUpperCase() + withDot.slice(1);
}
