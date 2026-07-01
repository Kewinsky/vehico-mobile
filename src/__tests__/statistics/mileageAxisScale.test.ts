import {
  generateNiceTicksForRange,
  mileageAxisScaleForData,
} from "../../screens/header/statistics/domain/math";

describe("generateNiceTicksForRange", () => {
  it("returns exactly 5 whole-number ticks spanning min and max", () => {
    const ticks = generateNiceTicksForRange(11_000, 16_000);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBeLessThanOrEqual(11_000);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(16_000);
    expect(ticks.every((tick) => Number.isInteger(tick))).toBe(true);
    expect(new Set(ticks).size).toBe(5);
  });

  it("returns exactly 5 ticks for a tight high-mileage range", () => {
    const ticks = generateNiceTicksForRange(147_500, 149_500);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBeLessThanOrEqual(147_500);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(149_500);
    expect(new Set(ticks).size).toBe(5);
  });
});

describe("mileageAxisScaleForData", () => {
  it("zooms to the 11k–16k range with padding", () => {
    const { minY, maxY, tickValues } = mileageAxisScaleForData([
      11_000, 12_000, 13_000, 14_000, 15_000, 16_000,
    ]);
    expect(minY).toBeLessThanOrEqual(11_000);
    expect(maxY).toBeGreaterThanOrEqual(16_000);
    expect(tickValues).toHaveLength(5);
    expect(tickValues[0]).toBe(minY);
    expect(tickValues[tickValues.length - 1]).toBe(maxY);
    expect(new Set(tickValues).size).toBe(5);
    expect(maxY - minY).toBeLessThan(20_000);
  });

  it("adds symmetric padding when all readings are equal", () => {
    const { minY, maxY } = mileageAxisScaleForData([100_000, 100_000, 100_000]);
    expect(minY).toBeLessThan(100_000);
    expect(maxY).toBeGreaterThan(100_000);
  });

  it("keeps a visible spread for small mileage values", () => {
    const { minY, maxY, tickValues } = mileageAxisScaleForData([
      90, 95, 100, 105, 110,
    ]);
    expect(tickValues).toHaveLength(5);
    expect(minY).toBeLessThanOrEqual(90);
    expect(maxY).toBeGreaterThanOrEqual(110);
  });

  it("returns exactly 5 ticks when there is no data", () => {
    const { tickValues } = mileageAxisScaleForData([]);
    expect(tickValues).toHaveLength(5);
    expect(new Set(tickValues).size).toBe(5);
  });
});
