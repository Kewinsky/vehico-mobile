import {
  isFiniteNumber,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDate,
  isValidDecimalInput,
  isValidDot,
  isValidEt,
  isValidProductionYear,
  parseDecimal,
  parseNonNegative,
  parsePositive,
  acceptDecimalInput,
} from "../../utils/validation";

describe("validation utils", () => {
  it("isValidDate checks YYYY-MM-DD and parsable date", () => {
    expect(isValidDate("2025-01-31")).toBe(true);
    expect(isValidDate("2025-13-31")).toBe(false);
    expect(isValidDate("31-01-2025")).toBe(false);
  });

  it("number validators behave as expected", () => {
    expect(isNonNegativeNumber("")).toBe(true);
    expect(isNonNegativeNumber("-1")).toBe(false);
    expect(isNonNegativeNumber("0")).toBe(true);
    expect(isNonNegativeNumber("123,50")).toBe(true);
    expect(isNonNegativeNumber("123,501")).toBe(false);

    expect(isPositiveNumber("")).toBe(false);
    expect(isPositiveNumber("0")).toBe(false);
    expect(isPositiveNumber("2")).toBe(true);
    expect(isPositiveNumber("123,50")).toBe(true);

    expect(isFiniteNumber("")).toBe(true);
    expect(isFiniteNumber("abc")).toBe(false);
    expect(isFiniteNumber("2.5")).toBe(true);
    expect(isFiniteNumber("2,5")).toBe(true);
  });

  it("decimal input helpers limit fractional digits", () => {
    expect(acceptDecimalInput("123,50", "123,501")).toBe("123,50");
    expect(acceptDecimalInput("123,50", "123,509")).toBe("123,50");
    expect(acceptDecimalInput("123,5", "123,50")).toBe("123,50");
    expect(acceptDecimalInput("", "12.34")).toBe("12.34");
    expect(acceptDecimalInput("12.3", "12.3.4")).toBe("12.34");
    expect(isValidDecimalInput("1,23")).toBe(true);
    expect(isValidDecimalInput("1,234")).toBe(false);
  });

  it("parsers return null on invalid/empty", () => {
    expect(parseNonNegative("")).toBeNull();
    expect(parseNonNegative("-1")).toBeNull();
    expect(parseNonNegative("3")).toBe(3);
    expect(parseNonNegative("3,5")).toBe(3.5);

    expect(parsePositive("")).toBeNull();
    expect(parsePositive("0")).toBeNull();
    expect(parsePositive("3")).toBe(3);
    expect(parsePositive("3,5")).toBe(3.5);

    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("1,5")).toBe(1.5);
    expect(parseDecimal("x")).toBeNull();
  });

  it("production year validates range and length", () => {
    expect(isValidProductionYear("2020")).toBe(true);
    expect(isValidProductionYear("20")).toBe(false);
    expect(isValidProductionYear("1800")).toBe(false);
  });

  it("DOT and ET validators", () => {
    expect(isValidDot("")).toBe(true);
    expect(isValidDot("1234")).toBe(true);
    expect(isValidDot("123")).toBe(false);

    expect(isValidEt("")).toBe(true);
    expect(isValidEt("9")).toBe(true);
    expect(isValidEt("99")).toBe(true);
    expect(isValidEt("100")).toBe(false);
  });
});
