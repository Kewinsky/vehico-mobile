import { normalizeDisplayName } from "../../utils/displayName";

describe("normalizeDisplayName", () => {
  it("returns empty for null/undefined/blank", () => {
    expect(normalizeDisplayName(null)).toBe("");
    expect(normalizeDisplayName(undefined)).toBe("");
    expect(normalizeDisplayName("   ")).toBe("");
  });

  it("trims and capitalizes first character", () => {
    expect(normalizeDisplayName(" jan")).toBe("Jan");
    expect(normalizeDisplayName("ądam")).toBe("Ądam");
  });
});
