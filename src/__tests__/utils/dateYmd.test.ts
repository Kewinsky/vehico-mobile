/// <reference types="jest" />

import { formatYmd, parseYmd } from "../../utils/dateYmd";

describe("dateYmd utils", () => {
  it("formatYmd returns YYYY-MM-DD with zero padding", () => {
    const date = new Date(2026, 0, 5); // local: 2026-01-05
    expect(formatYmd(date)).toBe("2026-01-05");
  });

  it("parseYmd parses valid YYYY-MM-DD string as local date", () => {
    const parsed = parseYmd("2026-12-09");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(11);
    expect(parsed.getDate()).toBe(9);
  });

  it("parseYmd trims input before parsing", () => {
    const parsed = parseYmd(" 2025-03-15 ");
    expect(formatYmd(parsed)).toBe("2025-03-15");
  });

  it("parseYmd returns fallback for invalid format", () => {
    const fallback = new Date(2030, 6, 1);
    const parsed = parseYmd("15-03-2025", fallback);
    expect(parsed).toBe(fallback);
  });

  it("parseYmd uses current date fallback when not provided", () => {
    jest.useFakeTimers();
    const now = new Date(2028, 3, 20);
    jest.setSystemTime(now);
    const parsed = parseYmd("bad-input");
    expect(parsed.getTime()).toBe(now.getTime());
    jest.useRealTimers();
  });
});
