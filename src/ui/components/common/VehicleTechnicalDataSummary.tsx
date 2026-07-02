import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { Vehicle } from "../../../types/domain";
import { useUnitDisplay } from "../../../app/hooks/useUnitDisplay";
import { groupThousands } from "../../../utils/numberFormatting";
import { ReportSummaryDataRow } from "./ReportSummaryDataRow";
import { ReportSummaryOptionGroup } from "./ReportSummaryOptionGroup";

const EMPTY_VALUE = "–";

function formatRegistrationDate(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY_VALUE;
  const localeCode = language.startsWith("pl") ? "pl-PL" : "en-US";
  return d.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = {
  vehicle: Vehicle;
};

export function VehicleTechnicalDataSummary({ vehicle }: Props) {
  const { t, i18n } = useTranslation();
  const { distanceUnitLabel } = useUnitDisplay();

  const rows = useMemo(() => {
    const val = (
      v: string | number | null | undefined,
      fallback: string = EMPTY_VALUE,
    ) =>
      v != null && String(v).trim() !== "" ? String(v).trim() : fallback;

    const typeVal =
      vehicle.type === "car"
        ? t("vehicleForm.car")
        : t("vehicleForm.motorcycle");
    const fuelVal =
      vehicle.fuel_type != null
        ? t(
            `vehicleForm.fuelType${
              vehicle.fuel_type.charAt(0).toUpperCase() +
              vehicle.fuel_type.slice(1)
            }` as
              | "vehicleForm.fuelTypePetrol"
              | "vehicleForm.fuelTypeDiesel"
              | "vehicleForm.fuelTypeHybrid"
              | "vehicleForm.fuelTypeElectric"
              | "vehicleForm.fuelTypeLpg",
          )
        : EMPTY_VALUE;

    return [
      { label: t("vehicleForm.type"), value: typeVal },
      { label: t("vehicleForm.makeLabel"), value: val(vehicle.make) },
      { label: t("vehicleForm.modelLabel"), value: val(vehicle.model) },
      {
        label: t("vehicleForm.yearLabel"),
        value:
          vehicle.production_year != null
            ? String(vehicle.production_year)
            : EMPTY_VALUE,
      },
      { label: t("vehicleForm.vinLabel"), value: val(vehicle.vin) },
      {
        label: t("vehicleForm.firstRegistrationDateLabel"),
        value: vehicle.first_registration_date
          ? formatRegistrationDate(
              vehicle.first_registration_date,
              i18n.language,
            )
          : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.licensePlateLabel"),
        value: val(vehicle.license_plate),
      },
      {
        label: t("vehicleForm.mileageLabel"),
        value:
          vehicle.mileage != null
            ? `${groupThousands(vehicle.mileage, 0, i18n.language)} ${distanceUnitLabel}`
            : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.initialMileageLabel"),
        value:
          vehicle.initial_mileage != null
            ? `${groupThousands(vehicle.initial_mileage, 0, i18n.language)} ${distanceUnitLabel}`
            : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.engineCapacityLabel"),
        value:
          vehicle.engine_capacity != null
            ? `${groupThousands(vehicle.engine_capacity, 0, i18n.language)} cm³`
            : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.powerHpLabel"),
        value:
          vehicle.power_hp != null
            ? `${groupThousands(vehicle.power_hp, 0, i18n.language)} ${t("vehicleForm.powerOutputUnit")}`
            : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.transmissionLabel"),
        value:
          vehicle.transmission != null
            ? vehicle.transmission === "manual"
              ? t("vehicleForm.transmissionManual")
              : t("vehicleForm.transmissionAutomatic")
            : EMPTY_VALUE,
      },
      {
        label: t("vehicleForm.driveTypeLabel"),
        value: vehicle.drive_type ?? EMPTY_VALUE,
      },
      { label: t("vehicleForm.fuelTypeLabel"), value: fuelVal },
    ];
  }, [vehicle, t, i18n.language, distanceUnitLabel]);

  return (
    <ReportSummaryOptionGroup title={t("publicReport.technicalData")}>
      {rows.map((row, index) => (
        <ReportSummaryDataRow
          key={row.label}
          label={row.label}
          value={row.value}
          isLast={index === rows.length - 1}
        />
      ))}
    </ReportSummaryOptionGroup>
  );
}
