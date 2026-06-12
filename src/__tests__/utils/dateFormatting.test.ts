import {
  formatDate,
  formatDateDisplay,
  formatLongMonthDisplayDate,
  formatMonthYear,
  formatMonthYearPL,
  formatShortDisplayDate,
} from "../../utils/dateFormatting";

describe("dateFormatting utils", () => {
  it("formatDate returns YYYY-MM-DD slice", () => {
    expect(formatDate("2025-03-15T10:30:00Z")).toBe("2025-03-15");
  });

  it("formatDateDisplay returns empty string for invalid date", () => {
    expect(formatDateDisplay("bad-date", "en")).toBe("");
  });

  it("formatDateDisplay uses locale branch pl/en", () => {
    const pl = formatDateDisplay("2025-03-15T00:00:00Z", "pl");
    const en = formatDateDisplay("2025-03-15T00:00:00Z", "en");
    expect(pl).not.toBe("");
    expect(en).not.toBe("");
    expect(pl).not.toBe(en);
  });

  it("formatShortDisplayDate handles null and invalid", () => {
    expect(formatShortDisplayDate(null, "en")).toBe("–");
    expect(formatShortDisplayDate("not-a-date", "en")).toBe("–");
  });

  it("formatShortDisplayDate formats valid date", () => {
    const out = formatShortDisplayDate("2025-03-15T00:00:00Z", "en");
    expect(out).toContain("2025");
  });

  it("formatLongMonthDisplayDate handles invalid and formats valid", () => {
    expect(formatLongMonthDisplayDate(undefined, "en")).toBe("");
    expect(formatLongMonthDisplayDate("bad-date", "en")).toBe("");
    const out = formatLongMonthDisplayDate("2025-03-15", "en");
    expect(out).toContain("2025");
  });

  it("formatMonthYear and formatMonthYearPL map month names", () => {
    expect(formatMonthYear("2025-01-01")).toBe("January 2025");
    expect(formatMonthYearPL("2025-01-01")).toBe("Styczeń 2025");
  });
});
