import type { ServiceInvoiceExtraction } from "../services/ai/serviceInvoiceImportRepo";
import type { ServiceEntryCategory } from "../types/domain";
import type { ServiceEntryRowState } from "./serviceEntryForm";

export type ServiceInvoiceDraftStrategy = "combined" | "separate";

export type ServiceInvoiceFormDraft = {
  mode: "single" | "multi";
  serviceDate: string | null;
  mileage: string | null;
  workshopName: string | null;
  category: ServiceEntryCategory;
  entries: ServiceEntryRowState[];
  description: string;
};

function amount(value: number | null): string {
  return value == null ? "" : String(value);
}

function workDescription(work: ServiceInvoiceExtraction["works"][number]) {
  return work.details ? `${work.title}: ${work.details}` : work.title;
}

export function buildServiceInvoiceFormDraft(
  extraction: ServiceInvoiceExtraction,
  strategy: ServiceInvoiceDraftStrategy,
  combinedTitle: string,
  formCurrency: string,
): ServiceInvoiceFormDraft {
  const canUseExtractedCosts =
    extraction.currency.status === "recognized" &&
    extraction.currency.value?.toUpperCase() === formCurrency.toUpperCase();
  const common = {
    serviceDate: extraction.serviceDate.value,
    mileage:
      extraction.mileage.value == null ? null : String(extraction.mileage.value),
    workshopName: extraction.workshopName.value,
  };

  if (strategy === "separate") {
    return {
      ...common,
      mode: "multi",
      category: extraction.works[0]?.category ?? "other",
      entries: extraction.works.map((work) => ({
        title: work.title,
        cost: amount(canUseExtractedCosts ? work.cost.value : null),
        category: work.category,
      })),
      description: "",
    };
  }

  const categories = new Set(extraction.works.map((work) => work.category));
  const category =
    categories.size === 1 ? (extraction.works[0]?.category ?? "other") : "other";
  const onlyWork = extraction.works.length === 1 ? extraction.works[0] : null;

  return {
    ...common,
    mode: "single",
    category,
    entries: [
      {
        title: onlyWork?.title ?? combinedTitle,
        cost: amount(
          canUseExtractedCosts
            ? (onlyWork?.cost.value ?? extraction.totalCost.value)
            : null,
        ),
        category,
      },
    ],
    description: extraction.works.map(workDescription).join("\n"),
  };
}
