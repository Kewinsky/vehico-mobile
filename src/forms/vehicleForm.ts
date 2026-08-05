import type {
  DriveType,
  FuelType,
  TransmissionType,
  VehicleType,
} from "../types/domain";
import {
  isNonNegativeNumber,
  isValidProductionYear,
  parseNonNegative,
} from "../utils/validation";

export type VehicleFormState = {
  type: VehicleType;
  vin: string;
  make: string;
  model: string;
  year: string;
  initialMileage: string;
  mileage: string;
  firstRegistrationDate: string;
  licensePlate: string;
  engineCapacity: string;
  powerHp: string;
  fuelType: FuelType | null;
  transmission: TransmissionType | null;
  driveType: DriveType | null;
  notes: string;
  insuranceValidUntil: string;
  acValidUntil: string;
  inspectionValidUntil: string;
};

export function canSaveVehicle(form: VehicleFormState): boolean {
  return (
    form.make.trim().length > 0 &&
    form.model.trim().length > 0 &&
    isValidProductionYear(form.year) &&
    isNonNegativeNumber(form.initialMileage) &&
    isNonNegativeNumber(form.mileage) &&
    isNonNegativeNumber(form.engineCapacity) &&
    isNonNegativeNumber(form.powerHp)
  );
}

export function vehicleFieldErrors(form: VehicleFormState) {
  return {
    make: !form.make.trim(),
    model: !form.model.trim(),
    year: !isValidProductionYear(form.year),
    initialMileage:
      form.initialMileage.trim().length > 0 &&
      !isNonNegativeNumber(form.initialMileage),
    mileage:
      form.mileage.trim().length > 0 && !isNonNegativeNumber(form.mileage),
    engineCapacity:
      form.engineCapacity.trim().length > 0 &&
      !isNonNegativeNumber(form.engineCapacity),
    powerHp:
      form.powerHp.trim().length > 0 && !isNonNegativeNumber(form.powerHp),
  };
}

export function buildVehiclePayload(form: VehicleFormState) {
  if (!canSaveVehicle(form)) {
    throw new Error("Invalid vehicle form");
  }

  return {
    type: form.type,
    vin: form.vin.trim().length ? form.vin.trim() : null,
    make: form.make.trim(),
    model: form.model.trim(),
    production_year: Number(form.year.trim()),
    initial_mileage: form.initialMileage.trim().length
      ? parseNonNegative(form.initialMileage)
      : null,
    mileage: form.mileage.trim().length ? parseNonNegative(form.mileage) : null,
    first_registration_date: form.firstRegistrationDate.trim().length
      ? form.firstRegistrationDate.trim()
      : null,
    license_plate: form.licensePlate.trim().length
      ? form.licensePlate.trim()
      : null,
    engine_capacity: form.engineCapacity.trim().length
      ? parseNonNegative(form.engineCapacity)
      : null,
    power_hp: form.powerHp.trim().length ? parseNonNegative(form.powerHp) : null,
    fuel_type: form.fuelType,
    transmission: form.transmission,
    drive_type: form.driveType,
    notes: form.notes.trim().length ? form.notes.trim() : null,
    insurance_valid_until: form.insuranceValidUntil.trim().length
      ? form.insuranceValidUntil.trim()
      : null,
    ac_valid_until: form.acValidUntil.trim().length
      ? form.acValidUntil.trim()
      : null,
    inspection_valid_until: form.inspectionValidUntil.trim().length
      ? form.inspectionValidUntil.trim()
      : null,
  };
}
