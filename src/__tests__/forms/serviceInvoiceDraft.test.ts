import { buildServiceInvoiceFormDraft } from "../../forms/serviceInvoiceDraft";
import type { ServiceInvoiceExtraction } from "../../services/ai/serviceInvoiceImportRepo";

const EXTRACTION: ServiceInvoiceExtraction = {
  serviceDate: { value: "2026-09-10", status: "recognized" },
  mileage: { value: 120000, status: "recognized" },
  workshopName: { value: "Workshop", status: "recognized" },
  totalCost: { value: 900, status: "recognized" },
  currency: { value: "PLN", status: "recognized" },
  works: [
    {
      title: "Oil change",
      details: "Oil and filter",
      category: "oil_change",
      categoryStatus: "recognized",
      cost: { value: 400, status: "recognized" },
    },
    {
      title: "Brake inspection",
      details: null,
      category: "inspection",
      categoryStatus: "recognized",
      cost: { value: null, status: "missing" },
    },
  ],
};

describe("serviceInvoiceDraft", () => {
  it("creates one detailed draft using the invoice total", () => {
    const draft = buildServiceInvoiceFormDraft(
      EXTRACTION,
      "combined",
      "Service invoice",
      "PLN",
    );

    expect(draft).toMatchObject({
      mode: "single",
      category: "other",
      serviceDate: "2026-09-10",
      mileage: "120000",
      workshopName: "Workshop",
      entries: [{ title: "Service invoice", cost: "900", category: "other" }],
    });
    expect(draft.description).toContain("Oil change: Oil and filter");
    expect(draft.description).toContain("Brake inspection");
  });

  it("creates separate drafts without dividing an unassigned total", () => {
    const draft = buildServiceInvoiceFormDraft(
      EXTRACTION,
      "separate",
      "Service invoice",
      "PLN",
    );

    expect(draft.mode).toBe("multi");
    expect(draft.entries).toEqual([
      { title: "Oil change", cost: "400", category: "oil_change" },
      { title: "Brake inspection", cost: "", category: "inspection" },
    ]);
  });

  it("uses one work's item cost and category for a single draft", () => {
    const extraction = { ...EXTRACTION, works: [EXTRACTION.works[0]!] };

    expect(
      buildServiceInvoiceFormDraft(
        extraction,
        "combined",
        "Service invoice",
        "PLN",
      ),
    ).toMatchObject({
      mode: "single",
      category: "oil_change",
      entries: [{ title: "Oil change", cost: "400", category: "oil_change" }],
    });
  });

  it("leaves costs blank when the invoice currency does not match the form", () => {
    const extraction: ServiceInvoiceExtraction = {
      ...EXTRACTION,
      currency: { value: "EUR", status: "recognized" },
    };

    expect(
      buildServiceInvoiceFormDraft(
        extraction,
        "separate",
        "Service invoice",
        "PLN",
      ).entries.map((entry) => entry.cost),
    ).toEqual(["", ""]);
  });
});
