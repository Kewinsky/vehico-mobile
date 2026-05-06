/**
 * Simple validation helpers for form inputs.
 * All accept string (input value) and return boolean or number.
 */

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** True if string is YYYY-MM-DD and parses to a valid date */
export function isValidDate(s: string): boolean {
  if (!s || !ISO_DATE_REGEX.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !Number.isNaN(d.getTime());
}

/** True if string parses to a finite number >= 0 */
export function isNonNegativeNumber(s: string): boolean {
  if (s.trim() === "") return true;
  const n = Number(s.trim());
  return Number.isFinite(n) && n >= 0;
}

/** True if string parses to a finite number > 0 */
export function isPositiveNumber(s: string): boolean {
  if (s.trim() === "") return false;
  const n = Number(s.trim());
  return Number.isFinite(n) && n > 0;
}

/** True if string parses to a finite number (any) */
export function isFiniteNumber(s: string): boolean {
  if (s.trim() === "") return true;
  const n = Number(s.trim());
  return Number.isFinite(n);
}

/** Parsed number or null if invalid/empty */
export function parseNonNegative(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parsePositive(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1885;
const MAX_YEAR = CURRENT_YEAR + 2;

/** True if string is 4-digit year in [MIN_YEAR, MAX_YEAR] */
export function isValidProductionYear(s: string): boolean {
  if (s.trim().length !== 4) return false;
  const n = Number(s.trim());
  return Number.isFinite(n) && n >= MIN_YEAR && n <= MAX_YEAR;
}

/** True if DOT is empty or exactly 4 digits */
export function isValidDot(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;
  return /^\d{4}$/.test(t);
}

/** True if ET offset is empty or 1–2 digit number (0–99) */
export function isValidEt(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;
  return /^\d{1,2}$/.test(t);
}

/** Parse decimal string (accepts both . and , as separator), returns null if empty or invalid */
export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/,/g, ".");
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// test
