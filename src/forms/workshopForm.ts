import type { WorkshopType } from "../types/domain";

export const WORKSHOP_TYPE_OPTIONS = [
  "mechanic",
  "electrician",
  "detailer",
  "bodywork",
  "car_wash",
  "other",
] as const satisfies readonly WorkshopType[];

export type WorkshopFormState = {
  name: string;
  workshopType: WorkshopType | null;
  phoneNumber: string;
  address: string;
};

export function canSaveWorkshop(form: WorkshopFormState): boolean {
  return form.name.trim().length > 0 && form.workshopType != null;
}

export function workshopFieldErrors(form: WorkshopFormState) {
  return {
    name: !form.name.trim(),
    workshopType: form.workshopType == null,
  };
}

export function buildWorkshopPayload(form: WorkshopFormState) {
  if (!canSaveWorkshop(form)) {
    throw new Error("Invalid workshop form");
  }

  return {
    name: form.name.trim(),
    workshop_type: form.workshopType!,
    phone_number: form.phoneNumber.trim() || null,
    address: form.address.trim() || null,
  };
}
