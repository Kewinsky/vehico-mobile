/**
 * Date formatting utilities
 * Shared functions for consistent date formatting across the app
 */

/**
 * Formats ISO date string to YYYY-MM-DD format (for forms/API, not for display)
 * @param iso ISO date string (e.g., "2024-01-15T10:30:00Z")
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Formats ISO date string for display, respecting app locale (pl-PL / en-US)
 * @param iso ISO date string (e.g., "2024-01-15T10:30:00Z")
 * @param locale Language code from i18n (e.g. "pl", "en", "pl-PL")
 * @returns Locale-formatted date (e.g. "15.01.2024" for PL, "1/15/2024" for EN)
 */
export function formatDateDisplay(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const localeCode = locale.startsWith("pl") ? "pl-PL" : "en-US";
  return d.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats date for card/detail display in "25 Oct 2026" style.
 * Uses app language (pl/en) while keeping day-month-year ordering.
 */
export function formatShortDisplayDate(
  input: string | Date | null | undefined,
  language?: string | null,
): string {
  if (!input) return "–";
  const date = input instanceof Date ? input : new Date(String(input));
  if (Number.isNaN(date.getTime())) return "–";
  const localeCode = (language ?? "en").toLowerCase().startsWith("pl")
    ? "pl-PL"
    : "en-GB";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(",", "");
}

/**
 * Long month name for notifications / readable headers, e.g.
 * PL: "24 marca 2026", EN: "24 March 2026".
 * Pass YYYY-MM-DD or ISO string; uses midday local to avoid TZ drift.
 */
export function formatLongMonthDisplayDate(
  input: string | Date | null | undefined,
  language?: string | null,
): string {
  if (!input) return "";
  const date =
    typeof input === "string"
      ? new Date(`${String(input).trim().slice(0, 10)}T12:00:00`)
      : input;
  if (Number.isNaN(date.getTime())) return "";
  const localeCode = (language ?? "en").toLowerCase().startsWith("pl")
    ? "pl-PL"
    : "en-GB";
  return new Intl.DateTimeFormat(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats date string to "Month Year" format in English
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Formatted string like "January 2024"
 */
export function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Formats date string to "Month Year" format in Polish
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Formatted string like "Styczeń 2024"
 */
export function formatMonthYearPL(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}
