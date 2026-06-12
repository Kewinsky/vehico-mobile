import { View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CalendarCheck, Fuel, Hash } from "lucide-react-native";

import { DriveTypeIcon } from "../../../../../ui/components/icons/DriveTypeIcon";
import { formatShortDisplayDate } from "../../../../../utils/dateFormatting";
import { groupThousands } from "../../../../../utils/numberFormatting";
import { DashboardSection } from "../../components/DashboardSection";
import { DetailItem } from "../../components/DetailItem";
import { OVERVIEW_DETAIL_ICON_SIZE } from "../constants";
import type { OverviewPanelProps } from "../types";

export function SpecificationSection({
  styles,
  theme,
  t,
  vehicle,
  language,
  distanceUnitLabel,
}: Pick<
  OverviewPanelProps,
  "styles" | "theme" | "t" | "vehicle" | "language" | "distanceUnitLabel"
>) {
  const iconSize = OVERVIEW_DETAIL_ICON_SIZE;
  const accent = theme.colors.accent;

  return (
    <DashboardSection title={t("dashboard.specification")}>
      <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.detailsGrid}>
          <View style={styles.detailsRow}>
            <DetailItem
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={iconSize}
                  color={accent}
                />
              }
              label={t("vehicleForm.yearLabel")}
              value={vehicle ? String(vehicle.production_year) : "–"}
            />
            <DetailItem
              icon={<Fuel size={iconSize} color={accent} />}
              label={t("vehicleForm.fuelTypeLabel")}
              value={
                vehicle?.fuel_type
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
                  : "–"
              }
            />
          </View>
          <View style={styles.detailsRow}>
            <DetailItem
              icon={
                <MaterialCommunityIcons
                  name="progress-clock"
                  size={iconSize}
                  color={accent}
                />
              }
              label={t("vehicleForm.initialMileageLabel")}
              value={
                vehicle?.initial_mileage != null
                  ? `${groupThousands(vehicle.initial_mileage, 0, language)} ${distanceUnitLabel}`
                  : "–"
              }
            />
            <DetailItem
              icon={
                <Ionicons
                  name="speedometer-outline"
                  size={iconSize}
                  color={accent}
                />
              }
              label={t("vehicleForm.mileageLabel")}
              value={
                vehicle?.mileage != null
                  ? `${groupThousands(vehicle.mileage, 0, language)} ${distanceUnitLabel}`
                  : "–"
              }
            />
          </View>
          <View style={styles.detailsRow}>
            <DetailItem
              icon={
                <MaterialCommunityIcons
                  name="engine"
                  size={iconSize}
                  color={accent}
                />
              }
              label={t("vehicleForm.engineCapacityLabel")}
              value={
                vehicle?.engine_capacity
                  ? `${groupThousands(vehicle.engine_capacity, 0, language)} cm³`
                  : "–"
              }
            />
            <DetailItem
              icon={
                <Ionicons name="flash-outline" size={iconSize} color={accent} />
              }
              label={t("vehicleForm.powerHpLabel")}
              value={
                vehicle?.power_hp
                  ? `${groupThousands(vehicle.power_hp, 0, language)} ${t("vehicleForm.powerOutputUnit")}`
                  : "–"
              }
            />
          </View>
          <View style={styles.detailsRow}>
            <DetailItem
              icon={
                <MaterialCommunityIcons
                  name="car-shift-pattern"
                  size={iconSize}
                  color={accent}
                />
              }
              label={t("vehicleForm.transmissionLabel")}
              value={
                vehicle?.transmission
                  ? t(
                      `vehicleForm.transmission${
                        vehicle.transmission.charAt(0).toUpperCase() +
                        vehicle.transmission.slice(1)
                      }` as
                        | "vehicleForm.transmissionManual"
                        | "vehicleForm.transmissionAutomatic",
                    )
                  : "–"
              }
            />
            <DetailItem
              icon={<DriveTypeIcon size={iconSize} color={accent} />}
              label={t("vehicleForm.driveTypeLabel")}
              value={vehicle?.drive_type || "–"}
            />
          </View>
          <View style={styles.detailsRow}>
            <DetailItem
              icon={<CalendarCheck size={iconSize} color={accent} />}
              label={t("vehicleForm.firstRegistrationDateLabel")}
              value={formatShortDisplayDate(
                vehicle?.first_registration_date ?? null,
                language,
              )}
            />
            <DetailItem
              icon={<Hash size={iconSize} color={accent} />}
              label={t("vehicleForm.licensePlateLabel")}
              value={vehicle?.license_plate ?? "–"}
            />
          </View>
        </View>
      </View>
    </DashboardSection>
  );
}
