import type { TireType } from "../types/domain";
import { isPositiveNumber, isValidDot, parsePositive } from "../utils/validation";

export const TIRE_WIDTH_MAX_LENGTH = 3;
export const TIRE_PROFILE_MAX_LENGTH = 2;
export const TIRE_DIAMETER_MAX_LENGTH = 2;
export const TIRE_DOT_MAX_LENGTH = 4;

export function sanitizeTireDigits(text: string, maxLength: number): string {
  return text.replace(/\D/g, "").slice(0, maxLength);
}

export const TIRE_TYPE_OPTIONS = [
  "summer",
  "winter",
  "all_season",
  "run_flat",
  "uhp",
  "suv_xl",
] as const satisfies readonly TireType[];

export type TireFormState = {
  name: string;
  width: string;
  profile: string;
  diameter: string;
  tireType: TireType | null;
  dot: string;
  isCurrentlyFitted: boolean;
};

function isValidTireWidth(s: string): boolean {
  const trimmed = s.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= TIRE_WIDTH_MAX_LENGTH &&
    isPositiveNumber(trimmed)
  );
}

function isValidTireProfile(s: string): boolean {
  const trimmed = s.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= TIRE_PROFILE_MAX_LENGTH &&
    isPositiveNumber(trimmed)
  );
}

function isValidTireDiameter(s: string): boolean {
  const trimmed = s.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= TIRE_DIAMETER_MAX_LENGTH &&
    isPositiveNumber(trimmed)
  );
}

export function canSaveTire(form: TireFormState): boolean {
  return (
    form.name.trim().length > 0 &&
    isValidTireWidth(form.width) &&
    isValidTireProfile(form.profile) &&
    isValidTireDiameter(form.diameter) &&
    form.tireType != null &&
    isValidDot(form.dot)
  );
}

export function tireFieldErrors(form: TireFormState) {
  return {
    name: !form.name.trim(),
    width: !isValidTireWidth(form.width),
    profile: !isValidTireProfile(form.profile),
    diameter: !isValidTireDiameter(form.diameter),
    tireType: form.tireType == null,
    dot: !isValidDot(form.dot),
  };
}

export function buildTirePayload(vehicleId: string, form: TireFormState) {
  if (!canSaveTire(form)) {
    throw new Error("Invalid tire form");
  }

  return {
    vehicle_id: vehicleId,
    name: form.name.trim(),
    width_mm: parsePositive(form.width)!,
    aspect_ratio: parsePositive(form.profile)!,
    diameter_inch: parsePositive(form.diameter)!,
    tire_type: form.tireType!,
    dot: form.dot.trim() || null,
    is_currently_fitted: form.isCurrentlyFitted,
  };
}
