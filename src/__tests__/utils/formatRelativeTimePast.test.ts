import {
  daysSinceYmd,
  formatRelativeTimePast,
} from "../../utils/formatRelativeTimePast";

describe("formatRelativeTimePast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-05-01T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("daysSinceYmd returns infinity for invalid input", () => {
    expect(daysSinceYmd("bad")).toBe(Number.POSITIVE_INFINITY);
  });

  it("daysSinceYmd returns whole-day diff for valid date", () => {
    expect(daysSinceYmd("2025-04-01")).toBe(30);
  });

  it("formats english months ago with min clamp 3", () => {
    // 45 days -> 1 month, clamped to 3
    expect(formatRelativeTimePast("2025-03-17", "en")).toBe("3 months ago");
  });

  it("formats polish forms", () => {
    const out = formatRelativeTimePast("2025-01-01", "pl");
    expect(out).toMatch(/miesiące|miesięcy/);
  });

  it("formats over a year for 12+ months", () => {
    expect(formatRelativeTimePast("2024-01-01", "en")).toBe("over a year ago");
    expect(formatRelativeTimePast("2024-01-01", "pl")).toBe("ponad rok temu");
  });
});

