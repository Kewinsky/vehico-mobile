import { SERVICE_ENTRY_PRESETS } from "../../screens/serviceEntryPresets";

describe("serviceEntryPresets", () => {
  it("defines quick-entry presets with unique title keys", () => {
    const keys = SERVICE_ENTRY_PRESETS.map((p) => p.titleKey);
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
    expect(SERVICE_ENTRY_PRESETS.some((p) => p.category === "oil_change")).toBe(
      true,
    );
  });
});
