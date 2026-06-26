import {
  TIRE_DIAMETER_MAX_LENGTH,
  TIRE_DOT_MAX_LENGTH,
  TIRE_PROFILE_MAX_LENGTH,
  TIRE_WIDTH_MAX_LENGTH,
  canSaveTire,
  sanitizeTireDigits,
} from "../../forms/tireForm";

describe("tireForm", () => {
  const validForm = {
    name: "Michelin",
    width: "225",
    profile: "45",
    diameter: "17",
    tireType: "summer" as const,
    dot: "2423",
    isCurrentlyFitted: false,
  };

  it("limits digit input length while typing", () => {
    expect(sanitizeTireDigits("2255", TIRE_WIDTH_MAX_LENGTH)).toBe("225");
    expect(sanitizeTireDigits("455", TIRE_PROFILE_MAX_LENGTH)).toBe("45");
    expect(sanitizeTireDigits("177", TIRE_DIAMETER_MAX_LENGTH)).toBe("17");
    expect(sanitizeTireDigits("24234", TIRE_DOT_MAX_LENGTH)).toBe("2423");
  });

  it("rejects values longer than allowed tire dimensions", () => {
    expect(canSaveTire({ ...validForm, width: "2255" })).toBe(false);
    expect(canSaveTire({ ...validForm, profile: "455" })).toBe(false);
    expect(canSaveTire({ ...validForm, diameter: "177" })).toBe(false);
    expect(canSaveTire({ ...validForm, dot: "24234" })).toBe(false);
  });
});
