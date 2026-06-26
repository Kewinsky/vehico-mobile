/**
 * Shared form input validation helpers.
 */

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_INPUT_REGEX = /^\d+([.,]\d{0,2})?$/;

/** True if empty or matches up to 2 fractional digits (`,` or `.`). */
export function isValidDecimalInput(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed === "") return true;
  return DECIMAL_INPUT_REGEX.test(trimmed);
}

/** Keep only digits and one decimal separator; max 2 digits after it. */
export function acceptDecimalInput(previous: string, text: string): string {
  const cleaned = text.replace(/[^\d.,]/g, "");
  const sepIndex = cleaned.search(/[.,]/);
  if (sepIndex < 0) return cleaned;

  const normalized =
    cleaned.slice(0, sepIndex) +
    cleaned[sepIndex] +
    cleaned.slice(sepIndex + 1).replace(/[.,]/g, "");

  return isValidDecimalInput(normalized) ? normalized : previous;
}

/** True if string is a positive integer. */
export function isPositiveInteger(s: string): boolean {
  const trimmed = s.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0;
}

export function parsePositiveInteger(s: string): number | null {
  if (!isPositiveInteger(s)) return null;
  return Number(s.trim());
}

function parseDecimalString(s: string): number | null {
  const n = Number(s.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

/** True if string is YYYY-MM-DD and parses to a valid date */
export function isValidDate(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed || !ISO_DATE_REGEX.test(trimmed)) return false;
  const d = new Date(trimmed);
  return !Number.isNaN(d.getTime());
}

/** True if string parses to a finite number >= 0 */
export function isNonNegativeNumber(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed === "") return true;
  if (!isValidDecimalInput(trimmed)) return false;
  const n = parseDecimalString(trimmed);
  return n !== null && n >= 0;
}

/** True if string parses to a finite number > 0 */
export function isPositiveNumber(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed === "") return false;
  if (!isValidDecimalInput(trimmed)) return false;
  const n = parseDecimalString(trimmed);
  return n !== null && n > 0;
}

/** True if string parses to a finite number (any) */
export function isFiniteNumber(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed === "") return true;
  if (!isValidDecimalInput(trimmed)) return false;
  return parseDecimalString(trimmed) !== null;
}

/** Parsed number or null if invalid/empty */
export function parseNonNegative(s: string): number | null {
  if (!isNonNegativeNumber(s)) return null;
  const trimmed = s.trim();
  if (trimmed === "") return null;
  return parseDecimalString(trimmed);
}

export function parsePositive(s: string): number | null {
  if (!isPositiveNumber(s)) return null;
  return parseDecimalString(s.trim());
}

/** Parse decimal string (accepts both . and , as separator), returns null if empty or invalid */
export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/,/g, ".");
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
