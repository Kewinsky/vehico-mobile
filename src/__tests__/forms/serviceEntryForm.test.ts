import {
  buildServiceEntryBasePayload,
  buildServiceEntryPayloads,
  canSaveServiceEntry,
  type ServiceEntryFormState,
} from "../../forms/serviceEntryForm";

const MULTI_FORM: ServiceEntryFormState = {
  mode: "multi",
  serviceDate: "2026-09-10",
  mileage: "120000",
  category: null,
  entries: [
    { title: "Oil change", cost: "400", category: "oil_change" },
    { title: "Brake inspection", cost: "", category: "inspection" },
  ],
  description: "",
  workshopId: null,
  workshopSnapshot: "Workshop",
};

describe("serviceEntryForm", () => {
  it("requires a category for every row in multi mode", () => {
    expect(canSaveServiceEntry(MULTI_FORM)).toBe(true);
    expect(
      canSaveServiceEntry({
        ...MULTI_FORM,
        entries: [MULTI_FORM.entries[0]!, { ...MULTI_FORM.entries[1]!, category: null }],
      }),
    ).toBe(false);
  });

  it("uses the first row category as the valid base payload category", () => {
    expect(
      buildServiceEntryBasePayload("vehicle-1", MULTI_FORM, "Workshop")
        .category,
    ).toBe("oil_change");
  });

  it("builds separate save payloads with row categories and costs", () => {
    expect(
      buildServiceEntryPayloads("vehicle-1", MULTI_FORM, "Workshop"),
    ).toEqual([
      expect.objectContaining({
        title: "Oil change",
        category: "oil_change",
        cost: 400,
        service_date: "2026-09-10",
        mileage: 120000,
        workshop_snapshot: "Workshop",
      }),
      expect.objectContaining({
        title: "Brake inspection",
        category: "inspection",
        cost: null,
        service_date: "2026-09-10",
        mileage: 120000,
        workshop_snapshot: "Workshop",
      }),
    ]);
  });

  it("builds one save payload with the shared category and description", () => {
    expect(
      buildServiceEntryPayloads(
        "vehicle-1",
        {
          ...MULTI_FORM,
          mode: "single",
          category: "maintenance",
          entries: [
            { title: "Annual service", cost: "900", category: "maintenance" },
          ],
          description: "All invoice works",
        },
        "Workshop",
      ),
    ).toEqual([
      expect.objectContaining({
        title: "Annual service",
        category: "maintenance",
        cost: 900,
        description: "All invoice works",
      }),
    ]);
  });
});
