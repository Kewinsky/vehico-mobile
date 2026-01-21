/**
 * Date formatting utilities
 * Shared functions for consistent date formatting across the app
 */

/**
 * Formats ISO date string to YYYY-MM-DD format
 * @param iso ISO date string (e.g., "2024-01-15T10:30:00Z")
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
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
