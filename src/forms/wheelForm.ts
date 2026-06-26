import { isPositiveNumber, isValidEt, parseDecimal, parsePositive } from "../utils/validation";

export type WheelFormState = {
  name: string;
  width: string;
  diameter: string;
  etOffset: string;
  boltPattern: string;
  centerBore: string;
  boltType: string;
  weight: string;
  isCurrentlyFitted: boolean;
};

function isValidWheelWidth(s: string): boolean {
  const parsed = parseDecimal(s);
  return parsed != null && parsed > 0;
}

export function canSaveWheel(form: WheelFormState): boolean {
  return (
    form.name.trim().length > 0 &&
    isValidWheelWidth(form.width) &&
    isPositiveNumber(form.diameter) &&
    isValidEt(form.etOffset)
  );
}

export function wheelFieldErrors(form: WheelFormState) {
  return {
    name: !form.name.trim(),
    width: !isValidWheelWidth(form.width),
    diameter: !isPositiveNumber(form.diameter),
    etOffset: !isValidEt(form.etOffset),
  };
}

export function buildWheelPayload(vehicleId: string, form: WheelFormState) {
  if (!canSaveWheel(form)) {
    throw new Error("Invalid wheel form");
  }

  return {
    vehicle_id: vehicleId,
    name: form.name.trim(),
    width_inch: parseDecimal(form.width)!,
    diameter_inch: parsePositive(form.diameter)!,
    et_offset: form.etOffset.trim() ? Number(form.etOffset.trim()) : null,
    bolt_pattern: form.boltPattern.trim() || null,
    center_bore_mm: parseDecimal(form.centerBore),
    bolt_type: form.boltType.trim() || null,
    weight_kg: parseDecimal(form.weight),
    is_currently_fitted: form.isCurrentlyFitted,
  };
}
