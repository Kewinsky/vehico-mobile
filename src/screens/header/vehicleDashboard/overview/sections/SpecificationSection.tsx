import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { FuelType, TransmissionType } from "../../../../../types/domain";
import { useTheme } from "../../../../../ui/ThemeProvider";
import { formatShortDisplayDate } from "../../../../../utils/dateFormatting";
import { groupThousands } from "../../../../../utils/numberFormatting";
import { DashboardSection } from "../../components/DashboardSection";
import type { OverviewPanelProps } from "../types";

type SpecRowItem = {
  label: string;
  value: string;
};

function enumLabel(
  prefix: "vehicleForm.fuelType" | "vehicleForm.transmission",
  value: string,
  t: OverviewPanelProps["t"],
) {
  const suffix = value.charAt(0).toUpperCase() + value.slice(1);
  return t(`${prefix}${suffix}` as never);
}

function isFilled(value: string | number | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function SpecificationSection({
  styles,
  theme,
  t,
  vehicle,
  language,
  vehicleId,
  navigation,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "vehicle"
  | "language"
  | "vehicleId"
  | "navigation"
>) {
  const { theme: appTheme } = useTheme();
  const specStyles = makeSpecStyles(appTheme);

  const fuelValue =
    vehicle?.fuel_type != null
      ? enumLabel("vehicleForm.fuelType", vehicle.fuel_type as FuelType, t)
      : null;
  const transmissionValue =
    vehicle?.transmission != null
      ? enumLabel(
          "vehicleForm.transmission",
          vehicle.transmission as TransmissionType,
          t,
        )
      : null;

  const engineRows: SpecRowItem[] = [
    vehicle?.engine_capacity
      ? {
          label: t("vehicleForm.engineCapacityLabel"),
          value: `${groupThousands(vehicle.engine_capacity, 0, language)} cm³`,
        }
      : null,
    vehicle?.power_hp
      ? {
          label: t("vehicleForm.powerHpLabel"),
          value: `${groupThousands(vehicle.power_hp, 0, language)} ${t("vehicleForm.powerOutputUnit")}`,
        }
      : null,
    fuelValue
      ? { label: t("vehicleForm.fuelTypeLabel"), value: fuelValue }
      : null,
  ].filter((row): row is SpecRowItem => row != null);

  const drivetrainRows: SpecRowItem[] = [
    transmissionValue
      ? { label: t("vehicleForm.transmissionLabel"), value: transmissionValue }
      : null,
    vehicle?.drive_type
      ? { label: t("vehicleForm.driveTypeLabel"), value: vehicle.drive_type }
      : null,
  ].filter((row): row is SpecRowItem => row != null);

  const plate = vehicle?.license_plate?.trim() || null;
  const firstRegistration = formatShortDisplayDate(
    vehicle?.first_registration_date ?? null,
    language,
  );
  const registrationRows: SpecRowItem[] = [
    plate
      ? { label: t("vehicleForm.licensePlateLabel"), value: plate }
      : null,
    vehicle
      ? {
          label: t("vehicleForm.yearLabel"),
          value: String(vehicle.production_year),
        }
      : null,
    firstRegistration !== "–"
      ? {
          label: t("vehicleForm.firstRegistrationDateLabel"),
          value: firstRegistration,
        }
      : null,
  ].filter((row): row is SpecRowItem => row != null);

  const optionalFields = [
    vehicle?.vin,
    vehicle?.license_plate,
    vehicle?.fuel_type,
    vehicle?.engine_capacity,
    vehicle?.power_hp,
    vehicle?.transmission,
    vehicle?.drive_type,
    vehicle?.first_registration_date,
  ];
  const missingCount = optionalFields.filter((value) => !isFilled(value)).length;
  const showCompleteCta = missingCount >= 2 && Boolean(vehicleId);

  const onCompleteSpec = useCallback(() => {
    navigation.navigate("VehicleForm", { vehicleId });
  }, [navigation, vehicleId]);

  return (
    <DashboardSection title={t("dashboard.specification")}>
      <View style={specStyles.stack}>
        <SpecCard
          title={t("dashboard.specEngine")}
          rows={engineRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
        />
        <SpecCard
          title={t("dashboard.specDrivetrain")}
          rows={drivetrainRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
        />
        <SpecCard
          title={t("dashboard.specRegistration")}
          rows={registrationRows}
          cardStyle={[
            styles.infoCard,
            specStyles.card,
            { backgroundColor: theme.colors.card },
          ]}
          styles={specStyles}
          theme={appTheme}
        />

        {showCompleteCta ? (
          <Pressable
            onPress={onCompleteSpec}
            accessibilityRole="button"
            style={({ pressed }) => [
              specStyles.completeCta,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={specStyles.completeCtaText}>
              {t("dashboard.completeSpecification")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </DashboardSection>
  );
}

function SpecCard({
  title,
  rows,
  cardStyle,
  styles,
  theme,
}: {
  title: string;
  rows: SpecRowItem[];
  cardStyle: object;
  styles: ReturnType<typeof makeSpecStyles>;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  if (rows.length === 0) return null;

  return (
    <View style={cardStyle}>
      <View
        style={[
          styles.cardHeader,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[
            styles.row,
            index < rows.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const makeSpecStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    stack: {
      gap: theme.spacing.sm,
    },
    card: {
      gap: 0,
    },
    cardHeader: {
      paddingBottom: theme.spacing.sm,
      marginBottom: theme.spacing.xs / 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    cardTitle: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
      letterSpacing: 0.4,
    },
    row: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    rowLabel: {
      flexShrink: 1,
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
    rowValue: {
      flexShrink: 1,
      textAlign: "right",
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
    },
    completeCta: {
      minHeight: 44,
      justifyContent: "center",
    },
    completeCtaText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.fg,
    },
  });
